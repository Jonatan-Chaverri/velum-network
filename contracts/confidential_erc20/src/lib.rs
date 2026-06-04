//!
//! ConfidentialERC20 - Stylus Contract (Noir ZK Proof Model)
//!
//! Confidential ERC-20 custody contract using user-side ElGamal encryption
//! (Grumpkin Curve) and Noir-generated ZK proofs for confidential transfers.
//!
//! Design:
//! - All cryptographic math (ElGamal, Grumpkin Curve, homomorphic add/sub, comparisons)
//!   happens OFF-CHAIN inside Noir circuits.
//! - This contract ONLY:
//!   - stores ciphertexts (as raw bytes),
//!   - verifies Noir proofs with domain separation,
//!   - updates balances using NEW ciphertexts provided by the proof,
//!   - manages ERC-20 custody (deposit/withdraw).
//!

// Allow `cargo stylus export-abi` to generate a main function.
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

#[macro_use]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{
    prelude::*,
    abi::Bytes as AbiBytes,
    call::RawCall,
    alloy_primitives::{Address, FixedBytes, U256, U32, Bytes},
    alloy_sol_types::{sol, SolCall},
};
use core::str::FromStr;

#[derive(PartialEq, Eq)]
pub struct Point {
    pub x: [u8; 32],
    pub y: [u8; 32],
}

// Ciphertext representation (ElGamal over BabyJub, treated as opaque bytes)
#[derive(PartialEq, Eq)]
pub struct Ciphertext {
    pub x1: Point,
    pub x2: Point,
}

pub struct DepositWidthdrawProofInputs {
    pub agent_pubkey: [u8; 64],
    pub current_balance: Ciphertext,
    pub new_balance: Ciphertext,
    pub amount: U256,
    pub token: Address,
    pub agent_id: u32,
}

pub struct TransferConfidentialProofInputs {
    pub receiver_pubkey: [u8; 64],
    pub receiver_current_balance: Ciphertext,
    pub receiver_new_balance: Ciphertext,
    pub sender_pubkey: [u8; 64],
    pub sender_current_balance: Ciphertext,
    pub sender_new_balance: Ciphertext,
    pub token: Address,
    pub sender_agent_id: u32,
    pub receiver_agent_id: u32,
}

pub const WETH_TOKEN_ADDRESS: &str = "0x2836ae2ea2c013acd38028fd0c77b92cccfa2ee4";

/// Length of the ABI-packed public inputs blob for the transfer_confidential proof.
/// See `_decode_transfer_confidential_proof_inputs` for the layout.
pub const TRANSFER_PROOF_INPUT_LEN: usize = 736;

/// This point represents 0 balance in the Grumpkin Curve
/// G_GENERATOR_X = 1
pub const G_GENERATOR_X: [u8; 32] = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
];
// G_GENERATOR_Y = sqrt(-16) = 17631683881184975370165255887551781615748388533673675138860
pub const G_GENERATOR_Y: [u8; 32] = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 
    0xCF, 0x13, 0x5E, 0x75, 0x06, 0xA4, 0x5D, 0x63, 
    0x2D, 0x27, 0x0D, 0x45, 0xF1, 0x18, 0x12, 0x94, 
    0x83, 0x3F, 0xC4, 0x8D, 0x82, 0x3F, 0x27, 0x2C
];

// Main storage
sol_storage! {
    #[entrypoint]
    pub struct ConfidentialERC20 {
        // Allowlist of supported underlying ERC-20 tokens
        mapping(address => bool) supported_tokens;

        // Store per agent public key
        mapping(uint32 => bytes32) pk_x;
        mapping(uint32 => bytes32) pk_y;

        // Address authorized to act for a given agent_id
        mapping(uint32 => address) agent_controllers;

        // Noir verifier contract (must implement verify(bytes,bytes32[]) -> bool)
        address deposit_verifier;
        address withdraw_verifier;
        address transfer_verifier;

        // Encrypted balances split into 4 mappings, one per coordinate.
        // Layout: balance ciphertext = (x1 = (x1_x, x1_y), x2 = (x2_x, x2_y))
        // mapping(token => mapping(agent_id => coord))
        mapping(bytes32 => mapping(uint32 => bytes32)) balances_x1_x;
        mapping(bytes32 => mapping(uint32 => bytes32)) balances_x1_y;

        mapping(bytes32 => mapping(uint32 => bytes32)) balances_x2_x;
        mapping(bytes32 => mapping(uint32 => bytes32)) balances_x2_y;

        // Reentrancy guard
        ReentrancyGuard guard;

        // Admin / owner
        address owner;
    }

    pub struct ReentrancyGuard {
        bool locked;
    }
}

// Helpers
#[inline(never)]
fn address_to_bytes32(addr: Address) -> FixedBytes<32> {
    let mut out = [0u8; 32];
    let bytes = addr.into_array();
    out[12..32].copy_from_slice(&bytes);
    FixedBytes::from(out)
}


// Events
sol! {
    /// Encrypted transfer occurred (logs new encrypted balances)
    event TransferConfidential(
        address indexed token,
        uint32 indexed from,
        uint32 indexed to
    );

    /// Plain deposit with encrypted balance update
    event Deposit(
        address indexed token,
        uint32 indexed agent_id
    );

    /// Plain withdrawal with encrypted balance update
    event Withdraw(
        address indexed token,
        uint32 indexed agent_id
    );

    event VerifierUpdated(address deposit_verifier, address withdraw_verifier, address transfer_verifier);
    event TokenAllowlistUpdated(address indexed token, bool allowed);
    event AgentPkRegistered(uint32 indexed agent_id, address indexed controller, bytes pk);
    event OwnershipTransferred(address indexed previous_owner, address indexed new_owner);

    // Standard ERC-20
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    // Noir verifier
    function verify(bytes proof, bytes32[] publicInputs) external view returns (bool);
}

#[public]
impl ConfidentialERC20 {
    /// One-time initialization
    pub fn init(
        &mut self, 
        deposit_verifier: Address, 
        withdraw_verifier: Address, 
        transfer_verifier: Address
    ) -> Result<(), Vec<u8>> {
        if self.owner.get() != Address::ZERO {
            return Err("Already initialized".into());
        }

        self.deposit_verifier.set(deposit_verifier);
        self.withdraw_verifier.set(withdraw_verifier);
        self.transfer_verifier.set(transfer_verifier);
        self.owner.set(self.vm().msg_sender());

        // For now we only support WETH token
        self.supported_tokens.setter(Address::from_str(WETH_TOKEN_ADDRESS).unwrap()).set(true);
        Ok(())
    }

    // Expects public key should be two points of the elliptic curve (we should use same elliptic
    // curve as the prover in this case Noir Grumpkin curve to generate this public key).
    //
    // The caller becomes the controller bound to `agent_id` and is the only address allowed to
    // submit deposit/withdraw/transfer transactions for that agent.
    pub fn register_agent_pk(&mut self, public_key: [u8; 64], agent_id: u32) -> Result<(), Vec<u8>> {
        if self._get_agent_pk(agent_id) != [0u8; 64] {
            return Err("Agent already registered".into());
        }

        // Safely convert to FixedBytes<32>
        let pk_x = FixedBytes::<32>::try_from(&public_key[..32]).unwrap();
        let pk_y = FixedBytes::<32>::try_from(&public_key[32..]).unwrap();

        let agent_key = U32::from(agent_id);
        self.pk_x.setter(agent_key).set(pk_x);
        self.pk_y.setter(agent_key).set(pk_y);

        let controller = self.vm().msg_sender();
        self.agent_controllers.setter(agent_key).set(controller);

        self.vm().log(AgentPkRegistered {
            agent_id,
            controller,
            pk: public_key.to_vec().into(),
        });

        // Set the initial balance to 0
        let initial_balance = Ciphertext {
            x1: Point { x: G_GENERATOR_X, y: G_GENERATOR_Y },
            x2: Point { x: *pk_x, y: *pk_y },
        };

        self._set_balance(
            Address::from_str(WETH_TOKEN_ADDRESS).unwrap(), agent_id, &initial_balance
        );

        Ok(())
    }

    /// Get encrypted balance for (token, agent). Only pk owner can decrypt this balance.
    pub fn balance_of_enc(&self, token: Address, agent_id: u32) -> [u8; 128] {
        let t = address_to_bytes32(token);
        let k = U32::from(agent_id);
        let x1_x: [u8; 32] = self.balances_x1_x.get(t).get(k).into();
        let x1_y: [u8; 32] = self.balances_x1_y.get(t).get(k).into();
        let x2_x: [u8; 32] = self.balances_x2_x.get(t).get(k).into();
        let x2_y: [u8; 32] = self.balances_x2_y.get(t).get(k).into();

        let mut result = [0u8; 128];
        result[0..32].copy_from_slice(&x1_x);
        result[32..64].copy_from_slice(&x1_y);
        result[64..96].copy_from_slice(&x2_x);
        result[96..128].copy_from_slice(&x2_y);
        result
    }

    pub fn get_agent_controller(&self, agent_id: u32) -> Address {
        self.agent_controllers.get(U32::from(agent_id))
    }

    /// Deposit/Withdraw plain ERC-20 tokens.
    ///
    /// `proof_inputs` MUST be 416 bytes laid out as:
    ///
    /// |  offset   | size | field                                |
    /// |-----------|------|--------------------------------------|
    /// |   0..64   |  64  | agent_pubkey                         |
    /// |  64..192  | 128  | current_balance (ciphertext)         |
    /// | 192..224  |  32  | token (address in last 20 bytes)     |
    /// | 224..256  |  32  | amount (big-endian U256)             |
    /// | 256..384  | 128  | new_balance (ciphertext)             |
    /// | 384..416  |  32  | agent_id (u32 in last 4 bytes)       |
    pub fn deposit(
        &mut self,
        proof_inputs: Vec<u8>,
        proof: AbiBytes,
    ) -> Result<(), Vec<u8>> {
        let proof_inputs_fixed: [u8; 416] = proof_inputs
            .try_into()
            .map_err(|_| b"bad deposit proof input length".to_vec())?;
        self._deposit_widthdraw(proof_inputs_fixed, proof, true)
    }

    pub fn withdraw(
        &mut self,
        proof_inputs: Vec<u8>,
        proof: AbiBytes,
    ) -> Result<(), Vec<u8>> {
        let proof_inputs_fixed: [u8; 416] = proof_inputs
            .try_into()
            .map_err(|_| b"bad withdraw proof input length".to_vec())?;
        self._deposit_widthdraw(proof_inputs_fixed, proof, false)
    }

    /// Confidential balance-to-balance transfer.
    ///
    /// `proof_inputs` MUST be `TRANSFER_PROOF_INPUT_LEN` (736) bytes. See
    /// `_decode_transfer_confidential_proof_inputs` for the exact layout.
    pub fn transfer_confidential(
        &mut self,
        proof_inputs: Vec<u8>,
        proof: AbiBytes,
    ) -> Result<(), Vec<u8>> {
        self._non_reentrant()?;

        let proof_inputs_fixed: [u8; TRANSFER_PROOF_INPUT_LEN] = proof_inputs
            .try_into()
            .map_err(|_| b"bad transfer proof input length".to_vec())?;

        if let Err(e) = self._verify_proof(&proof_inputs_fixed, proof, self.transfer_verifier.get()) {
            self._release_reentrancy();
            return Err([b"Proof verification failed: ".as_ref(), &e].concat());
        }

        let transfer_proof_inputs = match self._decode_transfer_confidential_proof_inputs(proof_inputs_fixed) {
            Ok(v) => v,
            Err(e) => {
                self._release_reentrancy();
                return Err(e);
            }
        };

        if let Err(err) = self._sanity_checks_for_transfer(&transfer_proof_inputs) {
            self._release_reentrancy();
            return Err(err);
        }

        // Confidential transfers are submitted by the contract owner (the app backend)
        // on behalf of agents, so user intervention is not required per transfer.
        if self.vm().msg_sender() != self.owner.get() {
            self._release_reentrancy();
            return Err("Only owner can submit transfers".into());
        }

        let token = transfer_proof_inputs.token;
        let from = transfer_proof_inputs.sender_agent_id;
        let receiver = transfer_proof_inputs.receiver_agent_id;

        self._set_balance(token, from, &transfer_proof_inputs.sender_new_balance);
        self._set_balance(token, receiver, &transfer_proof_inputs.receiver_new_balance);

        self.vm().log(TransferConfidential { token, from, to: receiver });

        self._release_reentrancy();
        Ok(())
    }

    // --- Admin ---
    pub fn set_verifier(
        &mut self,
        deposit_verifier: Address,
        withdraw_verifier: Address,
        transfer_verifier: Address
    ) -> Result<(), Vec<u8>> {
        self._only_owner()?;
        self.deposit_verifier.set(deposit_verifier);
        self.withdraw_verifier.set(withdraw_verifier);
        self.transfer_verifier.set(transfer_verifier);
        self.vm().log(VerifierUpdated {
            deposit_verifier,
            withdraw_verifier,
            transfer_verifier,
        });
        Ok(())
    }

    pub fn get_deposit_verifier(&self) -> Address {
        self.deposit_verifier.get()
    }

    pub fn get_withdraw_verifier(&self) -> Address {
        self.withdraw_verifier.get()
    }

    pub fn get_transfer_verifier(&self) -> Address {
        self.transfer_verifier.get()
    }

    pub fn get_owner(&self) -> Address {
        self.owner.get()
    }

    /// Transfer ownership of the contract to a new address. Only callable by the current owner.
    /// The new owner becomes the only account allowed to submit `transfer_confidential` and
    /// to call admin functions like `set_verifier`.
    pub fn transfer_ownership(&mut self, new_owner: Address) -> Result<(), Vec<u8>> {
        self._only_owner()?;
        if new_owner == Address::ZERO {
            return Err("Zero address".into());
        }
        let previous_owner = self.owner.get();
        self.owner.set(new_owner);
        self.vm().log(OwnershipTransferred { previous_owner, new_owner });
        Ok(())
    }

    pub fn is_supported_token(&self, token: Address) -> bool {
        self.supported_tokens.get(token)
    }

    pub fn get_agent_pk(&self, agent_id: u32) -> [u8; 64] {
        self._get_agent_pk(agent_id)
    }
}

// --- Internal logic ---
impl ConfidentialERC20 {
    // Reentrancy
    fn _non_reentrant(&mut self) -> Result<(), Vec<u8>> {
        if self.guard.locked.get() {
            return Err("Reentrant call".into());
        }
        self.guard.locked.set(true);
        Ok(())
    }

    fn _release_reentrancy(&mut self) {
        self.guard.locked.set(false);
    }

    // Owner-only
    fn _only_owner(&self) -> Result<(), Vec<u8>> {
        if self.vm().msg_sender() != self.owner.get() {
            return Err("Not owner".into());
        }
        Ok(())
    }

    /// Set encrypted balance for an agent and token.
    fn _set_balance(&mut self, token: Address, agent_id: u32, ct: &Ciphertext) {
        let t = address_to_bytes32(token);
        let k = U32::from(agent_id);
        self.balances_x1_x.setter(t).setter(k).set(FixedBytes::from(ct.x1.x));
        self.balances_x1_y.setter(t).setter(k).set(FixedBytes::from(ct.x1.y));
        self.balances_x2_x.setter(t).setter(k).set(FixedBytes::from(ct.x2.x));
        self.balances_x2_y.setter(t).setter(k).set(FixedBytes::from(ct.x2.y));
    }

    /// Verify a Noir proof.
    ///
    /// All cryptographic relations between ciphertexts & amounts live inside `proof_inputs`
    /// and are proved in Verifier before using them.
    fn _verify_proof(
        &self,
        proof_inputs: &[u8],
        proof: AbiBytes,
        verifier_address: Address,
    ) -> Result<(), Vec<u8>> {
        let mut public_inputs_vec: Vec<FixedBytes<32>> = Vec::new();

        for chunk in proof_inputs.chunks(32) {
            let mut buf = [0u8; 32];
            buf[..chunk.len()].copy_from_slice(chunk);
            public_inputs_vec.push(FixedBytes::<32>::from(buf));
        }

        // Typed call to verifier.verify(bytes,bytes32[])
        let calldata = verifyCall {
            proof: Bytes::from(proof.to_vec()),
            publicInputs: public_inputs_vec,
        }.abi_encode();

        let data = unsafe {
            RawCall::new_static(self.vm())
                .call(verifier_address, &calldata)
                .map_err(|_| b"verifier call reverted".to_vec())?
        };

        // verify(bytes,bytes32[]) returns a single bool, ABI-encoded as a 32-byte word
        // where the last byte is 0 (false) or 1 (true).
        if data.len() < 32 || data[31] == 0 {
            return Err(b"proof rejected".to_vec());
        }

        Ok(())
    }

    /// Plain ERC-20 transfer using typed sol! call
    fn _transfer(&self, token: Address, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        let calldata = transferCall { to, amount }.abi_encode();

        let res = unsafe {
            RawCall::new(self.vm())
                .call(token, &calldata)?
        };

        // Standard ERC-20 convention: if it returns a bool, check it.
        // If it returns nothing, treat as success.
        if res.len() >= 32 && res[31] == 0 {
            return Err("ERC20 transfer failed".into());
        }

        Ok(())
    }

    /// Plain ERC-20 transferFrom using typed sol! call
    fn _transfer_from(
        &self,
        token: Address,
        from: Address,
        to: Address,
        amount: U256,
    ) -> Result<(), Vec<u8>> {
        let calldata = transferFromCall { from, to, amount }.abi_encode();

        let res = unsafe {
            RawCall::new(self.vm())
                .call(token, &calldata)?
        };
    
        if res.len() >= 32 && res[31] == 0 {
            return Err("ERC20 transferFrom failed".into());
        }
    
        Ok(())
    }

    fn _decode_ciphertext(&self, ct: [u8; 128]) -> Ciphertext {
        Ciphertext {
            x1: Point { x: ct[..32].try_into().unwrap(), y: ct[32..64].try_into().unwrap() },
            x2: Point { x: ct[64..96].try_into().unwrap(), y: ct[96..128].try_into().unwrap() },
        }
    }

    /// Parse public inputs into DepositWidthdrawProofInputs struct.
    fn _decode_deposit_withdraw_proof_inputs(
        &self,
        proof_inputs: [u8; 416],
    ) -> Result<DepositWidthdrawProofInputs, Vec<u8>> {
    
        let agent_pubkey: [u8; 64] = proof_inputs[..64]
            .try_into()
            .map_err(|_| "bad pubkey slice".as_bytes().to_vec())?;
    
        let current_slice: [u8; 128] = proof_inputs[64..192]
            .try_into()
            .map_err(|_| "bad current_balance slice".as_bytes().to_vec())?;
    
        let current_balance = self._decode_ciphertext(current_slice);
    
        // Addresses only takes 20 bytes, so we need to only take the last 20 bytes
        let token = Address::from_slice(&proof_inputs[204..224]);

        let amount_bytes: [u8; 32] = proof_inputs[224..256]
            .try_into()
            .map_err(|_| "bad amount slice".as_bytes().to_vec())?;
        let amount = U256::from_be_bytes(amount_bytes);

        let new_slice: [u8; 128] = proof_inputs[256..384]
            .try_into()
            .map_err(|_| "bad new_balance slice".as_bytes().to_vec())?;

        let new_balance = self._decode_ciphertext(new_slice);

        // agent_id is encoded as a 32-byte big-endian word; only the last 4 bytes are meaningful.
        let agent_id_bytes: [u8; 4] = proof_inputs[412..416]
            .try_into()
            .map_err(|_| "bad agent_id slice".as_bytes().to_vec())?;
        let agent_id = u32::from_be_bytes(agent_id_bytes);

        Ok(DepositWidthdrawProofInputs {
            agent_pubkey,
            current_balance,
            new_balance,
            token,
            amount,
            agent_id,
        })
    }

    /// Parse public inputs into TransferConfidentialProofInputs struct.
    ///
    /// Canonical layout (total = `TRANSFER_PROOF_INPUT_LEN` = 736 bytes):
    ///
    /// | offset    | size | field                       |
    /// |-----------|------|-----------------------------|
    /// |   0..64   |  64  | receiver_pubkey             |
    /// |  64..192  | 128  | receiver_current_balance    |
    /// | 192..256  |  64  | sender_pubkey               |
    /// | 256..384  | 128  | sender_current_balance      |
    /// | 384..416  |  32  | token (address in 396..416) |
    /// | 416..544  | 128  | sender_new_balance          |
    /// | 544..672  | 128  | receiver_new_balance        |
    /// | 672..704  |  32  | sender_agent_id   (u32 in 700..704)   |
    /// | 704..736  |  32  | receiver_agent_id (u32 in 732..736)   |
    fn _decode_transfer_confidential_proof_inputs(
        &self,
        proof_inputs: [u8; TRANSFER_PROOF_INPUT_LEN],
    ) -> Result<TransferConfidentialProofInputs, Vec<u8>> {
        let receiver_pubkey: [u8; 64] = proof_inputs[0..64]
            .try_into()
            .map_err(|_| b"bad receiver_pubkey slice".to_vec())?;
        let receiver_current_slice: [u8; 128] = proof_inputs[64..192]
            .try_into()
            .map_err(|_| b"bad receiver_current_balance slice".to_vec())?;
        let sender_pubkey: [u8; 64] = proof_inputs[192..256]
            .try_into()
            .map_err(|_| b"bad sender_pubkey slice".to_vec())?;
        let sender_current_slice: [u8; 128] = proof_inputs[256..384]
            .try_into()
            .map_err(|_| b"bad sender_current_balance slice".to_vec())?;
        let token = Address::from_slice(&proof_inputs[396..416]);
        let sender_new_slice: [u8; 128] = proof_inputs[416..544]
            .try_into()
            .map_err(|_| b"bad sender_new_balance slice".to_vec())?;
        let receiver_new_slice: [u8; 128] = proof_inputs[544..672]
            .try_into()
            .map_err(|_| b"bad receiver_new_balance slice".to_vec())?;
        let sender_agent_id_bytes: [u8; 4] = proof_inputs[700..704]
            .try_into()
            .map_err(|_| b"bad sender_agent_id slice".to_vec())?;
        let receiver_agent_id_bytes: [u8; 4] = proof_inputs[732..736]
            .try_into()
            .map_err(|_| b"bad receiver_agent_id slice".to_vec())?;

        Ok(TransferConfidentialProofInputs {
            receiver_pubkey,
            receiver_current_balance: self._decode_ciphertext(receiver_current_slice),
            sender_pubkey,
            sender_current_balance: self._decode_ciphertext(sender_current_slice),
            token,
            sender_new_balance: self._decode_ciphertext(sender_new_slice),
            receiver_new_balance: self._decode_ciphertext(receiver_new_slice),
            sender_agent_id: u32::from_be_bytes(sender_agent_id_bytes),
            receiver_agent_id: u32::from_be_bytes(receiver_agent_id_bytes),
        })
    }

    fn _get_agent_pk(&self, agent_id: u32) -> [u8; 64] {
        let k = U32::from(agent_id);
        let pk_x: FixedBytes<32> = self.pk_x.get(k);
        let pk_y: FixedBytes<32> = self.pk_y.get(k);

        let mut pk = [0u8; 64];
        pk[..32].copy_from_slice(pk_x.as_slice());
        pk[32..64].copy_from_slice(pk_y.as_slice());
        pk
    }

    // Check if the current balance matches the proof inputs current amount
    fn _verify_current_amount(&self, token: Address, agent_id: u32, proof_current_balance: &Ciphertext) -> bool {
        let current_balance = self._decode_ciphertext(self.balance_of_enc(token, agent_id));
        if current_balance.x1.x != proof_current_balance.x1.x { return false; }
        if current_balance.x1.y != proof_current_balance.x1.y { return false; }
        if current_balance.x2.x != proof_current_balance.x2.x { return false; }
        if current_balance.x2.y != proof_current_balance.x2.y { return false; }
        true
    }

    fn _sanity_checks_for_transfer(
        &self,
        transfer_proof_inputs: &TransferConfidentialProofInputs
    ) -> Result<(), Vec<u8>> {
        if !self.supported_tokens.get(transfer_proof_inputs.token) {
            return Err("Token not supported".into());
        }

        // Receiver checks
        let registered_receiver_pk = self._get_agent_pk(transfer_proof_inputs.receiver_agent_id);
        if registered_receiver_pk == [0u8; 64] {
            return Err("Receiver agent not registered".into());
        }
        if registered_receiver_pk != transfer_proof_inputs.receiver_pubkey {
            return Err("Receiver public key mismatch".into());
        }
        if !self._verify_current_amount(
            transfer_proof_inputs.token,
            transfer_proof_inputs.receiver_agent_id,
            &transfer_proof_inputs.receiver_current_balance
        ) {
            return Err("Receiver Current balance mismatch".into());
        }

        // Sender checks
        let registered_sender_pk = self._get_agent_pk(transfer_proof_inputs.sender_agent_id);
        if registered_sender_pk == [0u8; 64] {
            return Err("Sender agent not registered".into());
        }
        if registered_sender_pk != transfer_proof_inputs.sender_pubkey {
            return Err("Sender public key mismatch".into());
        }
        if !self._verify_current_amount(
            transfer_proof_inputs.token,
            transfer_proof_inputs.sender_agent_id,
            &transfer_proof_inputs.sender_current_balance
        ) {
            return Err("Sender Current balance mismatch".into());
        }
        Ok(())
    }

    fn _deposit_widthdraw(
        &mut self,
        proof_inputs: [u8; 416],
        proof: AbiBytes,
        is_deposit: bool,
    ) -> Result<(), Vec<u8>> {
        self._non_reentrant()?;

        let result = self._deposit_widthdraw_inner(proof_inputs, proof, is_deposit);
        self._release_reentrancy();
        result
    }

    fn _deposit_widthdraw_inner(
        &mut self,
        proof_inputs: [u8; 416],
        proof: AbiBytes,
        is_deposit: bool,
    ) -> Result<(), Vec<u8>> {
        let caller_address = self.vm().msg_sender();

        let verifier = if is_deposit {
            self.deposit_verifier.get()
        } else {
            self.withdraw_verifier.get()
        };

        self._verify_proof(&proof_inputs, proof, verifier)
            .map_err(|e| [b"Proof verification failed: ".as_ref(), &e].concat())?;

        let deposit_proof_inputs = self
            ._decode_deposit_withdraw_proof_inputs(proof_inputs)
            .map_err(|_| b"Failed to decode deposit/withdraw proof inputs".to_vec())?;

        if !self.supported_tokens.get(deposit_proof_inputs.token) {
            return Err("Token not supported".into());
        }

        let agent_pk = self._get_agent_pk(deposit_proof_inputs.agent_id);
        if agent_pk == [0u8; 64] {
            return Err("Agent not registered".into());
        }
        if agent_pk != deposit_proof_inputs.agent_pubkey {
            return Err("Agent public key mismatch".into());
        }

        // Only the registered controller of this agent may submit deposit/withdraw.
        if self.agent_controllers.get(U32::from(deposit_proof_inputs.agent_id)) != caller_address {
            return Err("Not authorized for agent".into());
        }

        if !self._verify_current_amount(
            deposit_proof_inputs.token,
            deposit_proof_inputs.agent_id,
            &deposit_proof_inputs.current_balance,
        ) {
            return Err("Current balance mismatch".into());
        }

        let token = deposit_proof_inputs.token;
        let agent_id = deposit_proof_inputs.agent_id;
        let raw_amount = deposit_proof_inputs.amount;
        // ElGamal in the circuit operates on values bounded by ~40 bits, so the prover passes
        // amounts in "micro-token" units. Scale by 10^6 to recover the on-chain ERC-20 amount.
        // NOTE: the prover and the on-chain amount MUST agree on this scaling.
        let scale_factor = U256::from(1_000_000u64);
        let amount = raw_amount
            .checked_mul(scale_factor)
            .ok_or_else(|| b"amount overflow".to_vec())?;
        let new_balance = deposit_proof_inputs.new_balance;

        if is_deposit {
            self._transfer_from(token, caller_address, self.vm().contract_address(), amount)?;
            self._set_balance(token, agent_id, &new_balance);
            self.vm().log(Deposit { token, agent_id });
        } else {
            // withdraw — pay out to the registered controller (== caller_address here).
            self._transfer(token, caller_address, amount)?;
            self._set_balance(token, agent_id, &new_balance);
            self.vm().log(Withdraw { token, agent_id });
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests;
