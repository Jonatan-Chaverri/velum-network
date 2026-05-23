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
use stylus_sdk::evm;
use stylus_sdk::{
    prelude::*,
    abi::Bytes as AbiBytes,
    call::RawCall,
    alloy_primitives::{Address, FixedBytes, U256, Bytes},
    alloy_sol_types::{sol, SolCall},
};
use core::str::FromStr;

#[derive(PartialEq, Eq)]
pub struct Point {
    pub x: [u8; 32],
    pub y: [u8; 32],
}

impl Point {
    pub fn zero() -> Self {
        Self { x: [0u8; 32], y: [0u8; 32] }
    }

    pub fn from_bytes(bytes: [u8; 64]) -> Self {
        Self { x: bytes[..32].try_into().unwrap(), y: bytes[32..64].try_into().unwrap() }
    }
}

// Ciphertext representation (ElGamal over BabyJub, treated as opaque bytes)
#[derive(PartialEq, Eq)]
pub struct Ciphertext {
    pub x1: Point,
    pub x2: Point,
}

impl Ciphertext {
    pub fn zero() -> Self {
        Self { x1: Point::zero(), x2: Point::zero() }
    }
}

pub struct DepositWidthdrawProofInputs {
    pub user_pubkey: [u8; 64],
    pub current_balance: Ciphertext,
    pub new_balance: Ciphertext,
    pub amount: U256,
    pub user_address: Address,
    pub token: Address,
}

pub struct TransferConfidentialProofInputs {
    pub receiver_address: Address,
    pub receiver_pubkey: [u8; 64],
    pub receiver_current_balance: Ciphertext,
    pub receiver_new_balance: Ciphertext,
    pub sender_pubkey: [u8; 64],
    pub sender_current_balance: Ciphertext,
    pub sender_new_balance: Ciphertext,
    pub token: Address,
}

pub const WETH_TOKEN_ADDRESS: &str = "0x2836ae2ea2c013acd38028fd0c77b92cccfa2ee4";

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

        // Store per user public key
        mapping(address => bytes32) pk_x;
        mapping(address => bytes32) pk_y;

        // Noir verifier contract (must implement verify(bytes,bytes) -> bool)
        address deposit_verifier;
        address withdraw_verifier;
        address transfer_verifier;

        // Encrypted balances: mapping(token => mapping(user => ciphertext))
        mapping(bytes32 => mapping(bytes32 => bytes32)) balances_x1;
        mapping(bytes32 => mapping(bytes32 => bytes32)) balances_y1;

        mapping(bytes32 => mapping(bytes32 => bytes32)) balances_x2;
        mapping(bytes32 => mapping(bytes32 => bytes32)) balances_y2;

        // Nullifiers for replay protection: hash(proof) -> used?
        mapping(bytes32 => bool) nullifiers;

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

fn balance_key(token: Address, user: Address) -> (FixedBytes<32>, FixedBytes<32>) {
    (address_to_bytes32(token), address_to_bytes32(user))
}

// Events
sol! {
    /// Encrypted transfer occurred (logs new encrypted balances)
    event TransferConfidential(
        address indexed token,
        address indexed from,
        address indexed to,
    );

    /// Plain deposit with encrypted balance update
    event Deposit(
        address indexed token,
        address indexed user_address,
    );

    /// Plain withdrawal with encrypted balance update
    event Withdraw(
        address indexed token,
        address indexed user_address
    );

    event VerifierUpdated(address deposit_verifier, address withdraw_verifier, address transfer_verifier);
    event TokenAllowlistUpdated(address indexed token, bool allowed);
    event UserPkRegistered(address indexed user, bytes pk);

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
    // curve as the prover in this case Noir Grumpkin curve to generate this public key)
    pub fn register_user_pk(&mut self, public_key: [u8; 64]) -> Result<(), Vec<u8>> {
        let sender = self.vm().msg_sender();
        if self._get_user_pk(sender) != [0u8; 64] {
            return Err("User already registered".into());
        }

        // Safely convert to FixedBytes<32>
        let pk_x = FixedBytes::<32>::try_from(&public_key[..32]).unwrap();
        let pk_y = FixedBytes::<32>::try_from(&public_key[32..]).unwrap();

        self.pk_x.setter(sender).set(pk_x);
        self.pk_y.setter(sender).set(pk_y);

        evm::log(UserPkRegistered {
            user: sender,
            pk: public_key.into(),
        });

        // Set the initial balance to 0
        let initial_balance = Ciphertext {
            x1: Point { x: G_GENERATOR_X, y: G_GENERATOR_Y },
            x2: Point { x: *pk_x, y: *pk_y },
        };

        self._set_balance(
            Address::from_str(WETH_TOKEN_ADDRESS).unwrap(), sender, &initial_balance
        );

        Ok(())
    }

    /// Get encrypted balance for (token, user). Only pk owner can decrypt this balance.
    pub fn balance_of_enc(&self, token: Address, user: Address) -> [u8; 128] {
        let (t, u) = balance_key(token, user);
        let bx1: [u8; 32] = self.balances_x1.get(t).get(u).into();
        let bx2: [u8; 32] = self.balances_y1.get(t).get(u).into();

        let by1: [u8; 32] = self.balances_x2.get(t).get(u).into();
        let by2: [u8; 32] = self.balances_y2.get(t).get(u).into();

        let mut result = [0u8; 128];
        result[0..32].copy_from_slice(&bx1);
        result[32..64].copy_from_slice(&bx2);
        result[64..96].copy_from_slice(&by1);
        result[96..128].copy_from_slice(&by2);
        result
    }

    /// Deposit/Withdraw plain ERC-20 tokens.
    ///
    /// Required public inputs:
    /// user_pubkey: pub EmbeddedCurvePoint,
    /// current_balance_x1: pub EmbeddedCurvePoint,
    /// current_balance_x2: pub EmbeddedCurvePoint,
    /// user_address: pub Field,
    /// token: pub Field
    /// amount: pub Field,
    /// new_balance_x1: pub EmbeddedCurvePoint,
    /// new_balance_x2: pub EmbeddedCurvePoint,
    pub fn deposit(
        &mut self,
        proof_inputs: Vec<u8>,
        proof: AbiBytes,
    ) -> Result<(), Vec<u8>> {
        let proof_inputs_fixed: [u8; 416] = proof_inputs.try_into()?;
        self._deposit_widthdraw(proof_inputs_fixed, proof, true)
    }

    pub fn withdraw(
        &mut self,
        proof_inputs: Vec<u8>,
        proof: AbiBytes,
    ) -> Result<(), Vec<u8>> {
        let proof_inputs_fixed: [u8; 416] = proof_inputs.try_into()?;
        self._deposit_widthdraw(proof_inputs_fixed, proof, false)
    }

    /// Confidential balance-to-balance transfer.
    ///
    /// Required public inputs:
    /// receiver_address: pub Field,
    /// receiver_pubkey: pub EmbeddedCurvePoint,
    /// receiver_current_balance_x1: pub EmbeddedCurvePoint,
    /// receiver_current_balance_x2: pub EmbeddedCurvePoint,
    /// sender_pubkey: pub EmbeddedCurvePoint,
    /// sender_current_balance_x1: pub EmbeddedCurvePoint,
    /// sender_current_balance_x2: pub EmbeddedCurvePoint,
    /// token: pub Field
    /// sender_new_balance_x1: pub EmbeddedCurvePoint,
    /// sender_new_balance_x2: pub EmbeddedCurvePoint,
    /// receiver_new_balance_x1: pub EmbeddedCurvePoint,
    /// receiver_new_balance_x2: pub EmbeddedCurvePoint,
    pub fn transfer_confidential(
        &mut self,
        proof_inputs: Vec<u8>,
        proof: AbiBytes,
    ) -> Result<(), Vec<u8>> {
        self._non_reentrant()?;

        let proof_inputs_fixed: [u8; 704] = proof_inputs.try_into()?;

        let from = self.vm().msg_sender();
        let sender_pubkey = self._get_user_pk(from);
        if sender_pubkey == [0u8; 64] {
            self._release_reentrancy();
            return Err("User not registered".into());
        }

        if let Err(e) = self._verify_proof(&proof_inputs_fixed, proof, self.transfer_verifier.get()) {
            self._release_reentrancy();
            return Err("Proof verification failed".into());
        }

        let transfer_proof_inputs = self._decode_transfer_confidential_proof_inputs(proof_inputs_fixed);

        let result = self._sanity_checks_for_transfer(from, &transfer_proof_inputs);
        if let Err(err) = result {
            self._release_reentrancy();
            return Err(err);
        }

        let token = transfer_proof_inputs.token;
        let receiver_address = transfer_proof_inputs.receiver_address;
        let sender_new_balance = transfer_proof_inputs.sender_new_balance;
        let receiver_new_balance = transfer_proof_inputs.receiver_new_balance;

        self._set_balance(token, from, &sender_new_balance);
        self._set_balance(token, receiver_address, &receiver_new_balance);

        // Emit event with new ciphertexts for indexing/off-chain
        evm::log(TransferConfidential {
            token,
            from,
            to: transfer_proof_inputs.receiver_address
        });

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
        evm::log(VerifierUpdated {
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

    pub fn is_supported_token(&self, token: Address) -> bool {
        self.supported_tokens.get(token)
    }

    pub fn get_user_pk(&self, user: Address) -> [u8; 64] {
        self._get_user_pk(user)
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

    /// Set encrypted balance for a user and token.
    fn _set_balance(&mut self, token: Address, user: Address, ct: &Ciphertext) {
        let (t, u) = balance_key(token, user);
        self.balances_x1
            .setter(t)
            .setter(u)
            .set(FixedBytes::from(ct.x1.x));
        self.balances_y1
            .setter(t)
            .setter(u)
            .set(FixedBytes::from(ct.x1.y));
        self.balances_x2
            .setter(t)
            .setter(u)
            .set(FixedBytes::from(ct.x2.x));
        self.balances_y2
            .setter(t)
            .setter(u)
            .set(FixedBytes::from(ct.x2.y));
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
            buf[..32].copy_from_slice(chunk);
            public_inputs_vec.push(FixedBytes::<32>::from(buf));
        }
    
        // Typed call to verifier.verify(bytes,bytes)
        let calldata = verifyCall {
            proof: Bytes::from(proof.to_vec()),
            publicInputs: public_inputs_vec,
        }.abi_encode();

        unsafe {
            let res: Result<Vec<u8>, Vec<u8>> =RawCall::new_static().call(verifier_address, &calldata);
            let data = match res {
                Ok(data) => data,
                Err(_data) => panic!("Proof verification failed"),
            };
        }
    
        Ok(())
    }

    /// Plain ERC-20 transfer using typed sol! call
    fn _transfer(&self, token: Address, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        let calldata = transferCall { to, amount }.abi_encode();
    
        // raw CALL to token
        let res = unsafe {
            RawCall::new()
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
            RawCall::new()
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
    
        let user_pubkey: [u8; 64] = proof_inputs[..64]
            .try_into()
            .map_err(|_| "bad pubkey slice".as_bytes().to_vec())?;
    
        let current_slice: [u8; 128] = proof_inputs[64..192]
            .try_into()
            .map_err(|_| "bad current_balance slice".as_bytes().to_vec())?;
    
        let current_balance = self._decode_ciphertext(current_slice);
    
        // Addresses only takes 20 bytes, so we need to only take the last 20 bytes
        let user_address = Address::from_slice(&proof_inputs[204..224]);
        let token = Address::from_slice(&proof_inputs[236..256]);

        let amount_bytes: [u8; 32] = proof_inputs[256..288]
            .try_into()
            .map_err(|_| "bad amount slice".as_bytes().to_vec())?;
        let amount = U256::from_be_bytes(amount_bytes);

        let new_slice: [u8; 128] = proof_inputs[288..416]
            .try_into()
            .map_err(|_| "bad new_balance slice".as_bytes().to_vec())?;

        let new_balance = self._decode_ciphertext(new_slice);
    
        Ok(DepositWidthdrawProofInputs {
            user_pubkey,
            current_balance,
            new_balance,
            user_address,
            token,
            amount,
        })
    }

    /// Parse public inputs into TransferConfidentialProofInputs struct.
    fn _decode_transfer_confidential_proof_inputs(&self, proof_inputs: [u8; 704]) -> TransferConfidentialProofInputs {
        TransferConfidentialProofInputs {
            // Addresses only takes 20 bytes, so we need to only take the last 20 bytes
            receiver_address: Address::from_slice(&proof_inputs[12..32]),
            receiver_pubkey: proof_inputs[32..96].try_into().unwrap(),
            receiver_current_balance: self._decode_ciphertext(proof_inputs[96..224].try_into().unwrap()),
            sender_pubkey: proof_inputs[224..288].try_into().unwrap(),
            sender_current_balance: self._decode_ciphertext(proof_inputs[288..416].try_into().unwrap()),
            // Addresses only takes 20 bytes, so we need to trim
            token: Address::from_slice(&proof_inputs[428..448]),
            sender_new_balance: self._decode_ciphertext(proof_inputs[448..576].try_into().unwrap()),
            receiver_new_balance: self._decode_ciphertext(proof_inputs[576..704].try_into().unwrap()),
        }
    }

    fn _get_user_pk(&self, user: Address) -> [u8; 64] {
        let pk_x: FixedBytes<32> = self.pk_x.get(user);
        let pk_y: FixedBytes<32> = self.pk_y.get(user);
    
        let mut pk = [0u8; 64];
        pk[..32].copy_from_slice(pk_x.as_slice());
        pk[32..64].copy_from_slice(pk_y.as_slice());
        pk
    }    

    // Check if the current balance matches the proof inputs current amount
    fn _verify_current_amount(&self, token: Address, user: Address, proof_current_balance: &Ciphertext) -> bool {
        let current_balance = self._decode_ciphertext(self.balance_of_enc(token, user));
        if current_balance.x1.x != proof_current_balance.x1.x { return false; }
        if current_balance.x1.y != proof_current_balance.x1.y { return false; }
        if current_balance.x2.x != proof_current_balance.x2.x { return false; }
        if current_balance.x2.y != proof_current_balance.x2.y { return false; }
        true
    }

    fn _sanity_checks_for_transfer(
        &self,
        caller_address: Address,
        transfer_proof_inputs: &TransferConfidentialProofInputs
    ) -> Result<(), Vec<u8>> {
        if !self.supported_tokens.get(transfer_proof_inputs.token) {
            return Err("Token not supported".into());
        }
        // Receiver checks
        let receiver_registered_pubkey = self._get_user_pk(transfer_proof_inputs.receiver_address);
        if receiver_registered_pubkey == [0u8; 64] {
            return Err("Receiver not registered".into());
        }
        if receiver_registered_pubkey != transfer_proof_inputs.receiver_pubkey {
            return Err("Receiver public key mismatch".into());
        }

        if !self._verify_current_amount(
            transfer_proof_inputs.token, 
            transfer_proof_inputs.receiver_address,
            &transfer_proof_inputs.receiver_current_balance
        ) {
            return Err("Receiver Current balance mismatch".into());
        }

        // Sender checks
        let registered_sender_pk = self._get_user_pk(caller_address);
        if registered_sender_pk != transfer_proof_inputs.sender_pubkey {
            return Err("Sender public key mismatch".into());
        }
        if !self._verify_current_amount(
            transfer_proof_inputs.token,
            caller_address, 
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

        let from = self.vm().msg_sender();
        let user_pk = self._get_user_pk(from);
        if user_pk == [0u8; 64] {
            self._release_reentrancy();
            return Err("User not registered".into());
        }

        let verifier = if is_deposit {self.deposit_verifier.get()} else { self.withdraw_verifier.get()};
    
        if let Err(e) = self._verify_proof(&proof_inputs, proof, verifier) {
            self._release_reentrancy();
            return Err(["Proof verification failed: ".as_bytes(), &e].concat());
        }

        let deposit_proof_inputs = self
            ._decode_deposit_withdraw_proof_inputs(proof_inputs)
            .map_err(|_| "Failed to decode deposit/withdraw proof inputs".as_bytes().to_vec())?;

        if !self.supported_tokens.get(deposit_proof_inputs.token) {
            self._release_reentrancy();
            return Err("Token not supported".into());
        }

        if user_pk != deposit_proof_inputs.user_pubkey {
            self._release_reentrancy();
            return Err("User public key mismatch".into());
        }

        if !self._verify_current_amount(deposit_proof_inputs.token, from, &deposit_proof_inputs.current_balance) {
            self._release_reentrancy();
            return Err("Current balance mismatch".into());
        }

        let token = deposit_proof_inputs.token;
        let user_address = deposit_proof_inputs.user_address;
        
        let raw_amount = deposit_proof_inputs.amount;
        // Since ELGAMAL requires amounts not bigger than 40 bits, we need to scale the amount by 10^6
        let scale_factor = U256::from(1000000);
        let amount = raw_amount * scale_factor;
        let new_balance = deposit_proof_inputs.new_balance;

        // Move plain tokens into custody
        if is_deposit {
            self._transfer_from(
                token,
                from,
                self.vm().contract_address(),
                amount
            )?;

            // Store the NEW balance ciphertext (no math on-chain)
            self._set_balance(token, user_address, &new_balance);

            evm::log(Deposit {
                token,
                user_address
            });
        } else {
            // withdraw
            self._transfer(
                token,
                user_address,
                amount
            )?;

            // Store the NEW balance ciphertext (no math on-chain)
            self._set_balance(token, user_address, &new_balance);

            evm::log(Withdraw {
                token,
                user_address
            });
        }

        self._release_reentrancy();
        Ok(())
    }
}

#[cfg(test)]
mod tests;
