#![cfg(test)]

use super::*;
use stylus_sdk::testing::*;
use stylus_sdk::alloy_primitives::{Address, address, U256, FixedBytes, keccak256};

// helper
fn addr(n: u8) -> Address {
    let mut a = [0u8; 20];
    a[19] = n;
    Address::from(a)
}

#[test]
fn test_init_sets_owner_and_verifier() {
    let vm = TestVM::default();
    let mut contract = ConfidentialERC20::from(&vm);

    vm.set_sender(addr(1));
    let verifier = addr(2);
    contract.init(verifier, U256::from(99)).unwrap();

    assert_eq!(contract.get_verifier(), verifier);
    assert_eq!(contract.get_owner(), addr(1));
    assert_eq!(contract.chain_id.get(), U256::from(99));

    let err = contract.init(verifier, U256::from(99)).unwrap_err();
    assert!(String::from_utf8_lossy(&err).contains("Already initialized"));
}

#[test]
fn test_only_owner_can_set_supported_token() {
    let vm = TestVM::default();
    let mut contract = ConfidentialERC20::from(&vm);

    vm.set_sender(addr(1));
    contract.init(addr(9), U256::from(1)).unwrap();

    vm.set_sender(addr(1));
    let user = address!("0xCDC41bff86a62716f050622325CC17a317f99404");
    contract.set_supported_token(user, true).unwrap();
    assert!(contract.is_supported_token(addr(3)));

    vm.set_sender(addr(4));
    let err = contract.set_supported_token(addr(5), true).unwrap_err();
    assert!(String::from_utf8_lossy(&err).contains("Not owner"));
}

#[test]
fn test_register_user_pk_and_balance_read() {
    let vm = TestVM::default();
    let mut contract = ConfidentialERC20::from(&vm);

    vm.set_sender(addr(1));
    contract.init(addr(2), U256::from(1)).unwrap();

    vm.set_sender(addr(5));
    let pk = vec![0xAA; 32];
    contract.register_user_pk(pk.clone()).unwrap();

    let stored = contract.user_pk.get(addr(5));
    assert_eq!(stored.as_slice(), pk.as_slice());

    let (x1, x2) = contract.balance_of_enc(addr(8), addr(5));
    assert_eq!(x1, [0u8; 32]);
    assert_eq!(x2, [0u8; 32]);
}

#[test]
fn test_verify_proof_rejects_missing_pks() {
    let vm = TestVM::default();
    let mut contract = ConfidentialERC20::from(&vm);

    vm.set_sender(addr(1));
    contract.init(addr(99), U256::from(1)).unwrap();

    vm.set_sender(addr(10));
    contract.register_user_pk(vec![1u8; 32]).unwrap();

    let res = contract._verify_proof(
        addr(1),
        addr(10),
        addr(11),
        &vec![0u8; 64],
        &vec![0x01, 0x02, 0x03],
    );
    assert!(res.is_err());
    assert!(String::from_utf8_lossy(&res.unwrap_err()).contains("to pk not registered"));
}

#[test]
fn test_verify_proof_success_with_mocked_verifier() {
    let vm = TestVM::default();
    let mut contract = ConfidentialERC20::from(&vm);

    vm.set_sender(addr(1));
    let verifier = addr(100);
    contract.init(verifier, U256::from(77)).unwrap();

    // Register both pks
    vm.set_sender(addr(10));
    contract.register_user_pk(vec![1u8; 32]).unwrap();
    vm.set_sender(addr(11));
    contract.register_user_pk(vec![2u8; 32]).unwrap();

    // Mock ANY static call to verifier
    vm.mock_static_call(verifier, vec![], Ok(vec![0u8; 31].into_iter().chain(vec![1u8]).collect()));

    let res = contract._verify_proof(
        addr(1),
        addr(10),
        addr(11),
        &vec![0u8; 64],
        &vec![0xAA; 64],
    );
    assert!(res.is_ok());
}

#[test]
fn test_extract_amount_from_proof_inputs() {
    let vm = TestVM::default();
    let contract = ConfidentialERC20::from(&vm);

    let mut proof_inputs = vec![0u8; 64];
    proof_inputs[31] = 5;

    let amt = contract._extract_amount_from_proof_inputs(&proof_inputs).unwrap();
    assert_eq!(amt, U256::from(5));

    let err = contract._extract_amount_from_proof_inputs(&vec![1, 2, 3]).unwrap_err();
    assert!(String::from_utf8_lossy(&err).contains("Invalid proof inputs"));
}

#[test]
fn test_non_reentrancy_guard_blocks_second_call() {
    let vm = TestVM::default();
    let mut contract = ConfidentialERC20::from(&vm);

    contract.guard.locked.set(true);
    let err = contract._non_reentrant().unwrap_err();
    assert!(String::from_utf8_lossy(&err).contains("Reentrant call"));
}

#[test]
fn test_deposit_with_mocked_erc20_transferfrom() {
    let vm = TestVM::default();
    let mut contract = ConfidentialERC20::from(&vm);

    vm.set_sender(addr(1));
    contract.init(addr(2), U256::from(1)).unwrap();

    // Allow token
    vm.set_sender(addr(1));
    contract.set_supported_token(addr(50), true).unwrap();

    // Mock ERC20::transferFrom() call
    vm.mock_call(
        addr(50),
        vec![],
        Ok(vec![0u8; 31].into_iter().chain(vec![1u8]).collect()),
    );

    vm.set_sender(addr(3));
    let res = contract.deposit(
        addr(50),
        U256::from(10),
        [1u8; 32],
        [2u8; 32],
        addr(3),
    );
    assert!(res.is_ok());
}
