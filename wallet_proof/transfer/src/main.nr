use elgamal::{add_ciphertexts, CipherText, encrypt, public_key, decrypt, verify_embedding};
use std::embedded_curve_ops::EmbeddedCurvePoint;

// ==================== CUSTOM TYPES ====================

// Point without is_infinite flag (matches contract expectations)
struct Point {
    x: Field,
    y: Field
}

// ==================== HELPER FUNCTIONS ====================

// Negate an elliptic curve point by negating its y-coordinate
fn negate_point(p: EmbeddedCurvePoint) -> EmbeddedCurvePoint {
    EmbeddedCurvePoint {
        x: p.x,
        y: 0 - p.y,
        is_infinite: p.is_infinite
    }
}

// Homomorphic subtraction: a - b = a + (-b)
fn subtract_ciphertexts(a: CipherText, b: CipherText) -> CipherText {
    let negated_b = (negate_point(b.0), negate_point(b.1));
    add_ciphertexts(a, negated_b)
}

// ==================== TRANSFER CIRCUIT ====================
// Allows one agent to privately transfer tokens to another agent
// Uses homomorphic addition for receiver's balance (no receiver private key needed!)
//
// PUBLIC INPUTS/OUTPUTS BYTE LAYOUT (matching Rust contract):
// [0..64]:     receiver_pubkey (x: 32, y: 32)
// [64..192]:   receiver_current_balance (x1.x: 32, x1.y: 32, x2.x: 32, x2.y: 32)
// [192..256]:  sender_pubkey (x: 32, y: 32)
// [256..384]:  sender_current_balance (x1.x: 32, x1.y: 32, x2.x: 32, x2.y: 32)
// [384..416]:  token (32)
// [416..544]:  sender_new_balance (x1.x: 32, x1.y: 32, x2.x: 32, x2.y: 32) - OUTPUT
// [544..672]:  receiver_new_balance (x1.x: 32, x1.y: 32, x2.x: 32, x2.y: 32) - OUTPUT
// [672..704]:  sender_agent_id (32) - OUTPUT
// [704..736]:  receiver_agent_id (32) - OUTPUT
// Total: 736 bytes

fn main(
    // Private inputs (secrets not revealed in proof)
    sender_priv_key: Field,
    transfer_amount: Field,          // Amount to transfer (kept private)
    sender_current_balance: Field,   // Plaintext of sender's current balance (stays private!)
    r_amount_sender: Field,          // Randomness for encrypting transfer amount under sender's key
    r_amount_receiver: Field,        // Randomness for encrypting transfer amount under receiver's key
    sender_agent_id: Field,
    receiver_agent_id: Field,

    // Public inputs (visible in proof) - ORDER MATTERS for contract!
    receiver_pubkey: pub Point,
    receiver_old_balance_x1: pub Point,
    receiver_old_balance_x2: pub Point,
    sender_pubkey: pub Point,
    sender_old_balance_x1: pub Point,
    sender_old_balance_x2: pub Point,
    token: pub Field
) -> pub (Point, Point, Point, Point, Field, Field) {  // Returns balances plus both agent IDs
    // Reconstruct EmbeddedCurvePoint and CipherText structs from Point structs
    let sender_pubkey_ec = EmbeddedCurvePoint {
        x: sender_pubkey.x,
        y: sender_pubkey.y,
        is_infinite: false
    };

    let receiver_pubkey_ec = EmbeddedCurvePoint {
        x: receiver_pubkey.x,
        y: receiver_pubkey.y,
        is_infinite: false
    };

    let old_balance_sender_ct: CipherText = (
        EmbeddedCurvePoint { x: sender_old_balance_x1.x, y: sender_old_balance_x1.y, is_infinite: false },
        EmbeddedCurvePoint { x: sender_old_balance_x2.x, y: sender_old_balance_x2.y, is_infinite: false }
    );

    let old_balance_receiver_ct: CipherText = (
        EmbeddedCurvePoint { x: receiver_old_balance_x1.x, y: receiver_old_balance_x1.y, is_infinite: false },
        EmbeddedCurvePoint { x: receiver_old_balance_x2.x, y: receiver_old_balance_x2.y, is_infinite: false }
    );

    // Enforce range constraints
    transfer_amount.assert_max_bit_size::<40>();
    sender_agent_id.assert_max_bit_size::<32>();
    receiver_agent_id.assert_max_bit_size::<32>();
    sender_current_balance.assert_max_bit_size::<40>();

    // Verify sender's public key matches their private key
    let computed_sender_pubkey = public_key(sender_priv_key);
    assert(computed_sender_pubkey == sender_pubkey_ec);

    // SOLVENCY CHECK: bind the private plaintext balance to the public on-chain
    // ciphertext, then require balance >= amount. Without this, homomorphic
    // subtraction would wrap "negative" and a sender could mint spendable
    // credit for the receiver out of thin air.
    let decrypted_sender_balance = decrypt(old_balance_sender_ct, sender_priv_key);
    verify_embedding(decrypted_sender_balance, sender_current_balance);
    assert(sender_current_balance as u64 >= transfer_amount as u64);

    // Encrypt transfer amount under sender's public key
    let transfer_amount_sender_ct = encrypt(sender_pubkey_ec, transfer_amount, r_amount_sender);

    // HOMOMORPHIC SUBTRACTION for sender: new_balance = old_balance - amount
    let sender_new_balance_ct = subtract_ciphertexts(old_balance_sender_ct, transfer_amount_sender_ct);

    // Encrypt transfer amount under receiver's public key
    let transfer_amount_receiver_ct = encrypt(receiver_pubkey_ec, transfer_amount, r_amount_receiver);

    // HOMOMORPHIC ADDITION for receiver: new_balance = old_balance + amount
    // Sender doesn't need receiver's private key!
    let receiver_new_balance_ct = add_ciphertexts(old_balance_receiver_ct, transfer_amount_receiver_ct);

    // Return both new encrypted balances as 4 Points
    let sender_new_balance_x1 = Point { x: sender_new_balance_ct.0.x, y: sender_new_balance_ct.0.y };
    let sender_new_balance_x2 = Point { x: sender_new_balance_ct.1.x, y: sender_new_balance_ct.1.y };
    let receiver_new_balance_x1 = Point { x: receiver_new_balance_ct.0.x, y: receiver_new_balance_ct.0.y };
    let receiver_new_balance_x2 = Point { x: receiver_new_balance_ct.1.x, y: receiver_new_balance_ct.1.y };

    (
        sender_new_balance_x1,
        sender_new_balance_x2,
        receiver_new_balance_x1,
        receiver_new_balance_x2,
        sender_agent_id,
        receiver_agent_id
    )
}

// ==================== TESTS ====================

#[test]
fn test_transfer_basic() {
    // Setup: Sender agent with 1000 tokens transfers 300 to receiver agent with 500 tokens
    let sender_priv_key = 42;
    let sender_pubkey = public_key(sender_priv_key);
    let sender_agent_id = 7;

    // Receiver's private key is ONLY used in test to verify the result
    // The sender NEVER needs to know this!
    let receiver_priv_key = 100;
    let receiver_pubkey = public_key(receiver_priv_key);
    let receiver_agent_id = 11;

    let sender_balance = 1000;
    let receiver_balance = 500;
    let transfer_amount = 300;

    let expected_sender_new_balance = 700;
    let expected_receiver_new_balance = 800;

    // Encrypt balances
    let r_old_sender = 111;
    let old_balance_sender_ct = encrypt(sender_pubkey, sender_balance, r_old_sender);

    let r_old_receiver = 333;
    let old_balance_receiver_ct = encrypt(receiver_pubkey, receiver_balance, r_old_receiver);

    // Randomness for encrypting transfer amount
    let r_amount_sender = 222;
    let r_amount_receiver = 444;

    // Call circuit - it will compute and return both new balances
    let (
        sender_new_x1,
        sender_new_x2,
        receiver_new_x1,
        receiver_new_x2,
        returned_sender_agent_id,
        returned_receiver_agent_id
    ) = main(
        sender_priv_key,
        transfer_amount,
        sender_balance,
        r_amount_sender,
        r_amount_receiver,
        sender_agent_id,
        receiver_agent_id,
        Point { x: receiver_pubkey.x, y: receiver_pubkey.y },
        Point { x: old_balance_receiver_ct.0.x, y: old_balance_receiver_ct.0.y },
        Point { x: old_balance_receiver_ct.1.x, y: old_balance_receiver_ct.1.y },
        Point { x: sender_pubkey.x, y: sender_pubkey.y },
        Point { x: old_balance_sender_ct.0.x, y: old_balance_sender_ct.0.y },
        Point { x: old_balance_sender_ct.1.x, y: old_balance_sender_ct.1.y },
        3  // token address
    );

    // Reconstruct returned balances as CipherTexts
    let returned_sender_new_balance_ct: CipherText = (
        EmbeddedCurvePoint { x: sender_new_x1.x, y: sender_new_x1.y, is_infinite: false },
        EmbeddedCurvePoint { x: sender_new_x2.x, y: sender_new_x2.y, is_infinite: false }
    );
    let returned_receiver_new_balance_ct: CipherText = (
        EmbeddedCurvePoint { x: receiver_new_x1.x, y: receiver_new_x1.y, is_infinite: false },
        EmbeddedCurvePoint { x: receiver_new_x2.x, y: receiver_new_x2.y, is_infinite: false }
    );

    // Verify: sender's returned new balance decrypts correctly
    let decrypted_sender_new = decrypt(returned_sender_new_balance_ct, sender_priv_key);
    verify_embedding(decrypted_sender_new, expected_sender_new_balance);

    // Verify: receiver's returned new balance decrypts correctly using RECEIVER'S private key
    let decrypted_receiver_new = decrypt(returned_receiver_new_balance_ct, receiver_priv_key);
    verify_embedding(decrypted_receiver_new, expected_receiver_new_balance);
    assert(returned_sender_agent_id == sender_agent_id);
    assert(returned_receiver_agent_id == receiver_agent_id);
}

#[test]
fn test_transfer_to_zero_balance() {
    // Setup: Transfer to agent with zero balance
    let sender_priv_key = 42;
    let sender_pubkey = public_key(sender_priv_key);
    let sender_agent_id = 7;

    let receiver_priv_key = 100;
    let receiver_pubkey = public_key(receiver_priv_key);
    let receiver_agent_id = 11;

    let sender_balance = 1000;
    let receiver_balance = 0; // Zero balance
    let transfer_amount = 500;

    let r_old_sender = 111;
    let old_balance_sender_ct = encrypt(sender_pubkey, sender_balance, r_old_sender);

    let r_old_receiver = 333;
    let old_balance_receiver_ct = encrypt(receiver_pubkey, receiver_balance, r_old_receiver);

    let r_amount_sender = 222;
    let r_amount_receiver = 444;

    // Call circuit - it will compute and return both new balances
    let (
        sender_new_x1,
        sender_new_x2,
        receiver_new_x1,
        receiver_new_x2,
        returned_sender_agent_id,
        returned_receiver_agent_id
    ) = main(
        sender_priv_key,
        transfer_amount,
        sender_balance,
        r_amount_sender,
        r_amount_receiver,
        sender_agent_id,
        receiver_agent_id,
        Point { x: receiver_pubkey.x, y: receiver_pubkey.y },
        Point { x: old_balance_receiver_ct.0.x, y: old_balance_receiver_ct.0.y },
        Point { x: old_balance_receiver_ct.1.x, y: old_balance_receiver_ct.1.y },
        Point { x: sender_pubkey.x, y: sender_pubkey.y },
        Point { x: old_balance_sender_ct.0.x, y: old_balance_sender_ct.0.y },
        Point { x: old_balance_sender_ct.1.x, y: old_balance_sender_ct.1.y },
        3
    );

    // Reconstruct returned balances
    let returned_sender_new_balance_ct: CipherText = (
        EmbeddedCurvePoint { x: sender_new_x1.x, y: sender_new_x1.y, is_infinite: false },
        EmbeddedCurvePoint { x: sender_new_x2.x, y: sender_new_x2.y, is_infinite: false }
    );
    let returned_receiver_new_balance_ct: CipherText = (
        EmbeddedCurvePoint { x: receiver_new_x1.x, y: receiver_new_x1.y, is_infinite: false },
        EmbeddedCurvePoint { x: receiver_new_x2.x, y: receiver_new_x2.y, is_infinite: false }
    );

    let decrypted_sender_new = decrypt(returned_sender_new_balance_ct, sender_priv_key);
    verify_embedding(decrypted_sender_new, 500);

    let decrypted_receiver_new = decrypt(returned_receiver_new_balance_ct, receiver_priv_key);
    verify_embedding(decrypted_receiver_new, 500);
    assert(returned_sender_agent_id == sender_agent_id);
    assert(returned_receiver_agent_id == receiver_agent_id);
}

#[test(should_fail)]
fn test_transfer_more_than_balance_fails() {
    // Sender with 100 tokens tries to transfer 500 - must be rejected
    let sender_priv_key = 42;
    let sender_pubkey = public_key(sender_priv_key);
    let receiver_priv_key = 100;
    let receiver_pubkey = public_key(receiver_priv_key);

    let sender_balance = 100;
    let transfer_amount = 500;

    let old_balance_sender_ct = encrypt(sender_pubkey, sender_balance, 111);
    let old_balance_receiver_ct = encrypt(receiver_pubkey, 0, 333);

    let _ = main(
        sender_priv_key,
        transfer_amount,
        sender_balance,
        222,
        444,
        7,
        11,
        Point { x: receiver_pubkey.x, y: receiver_pubkey.y },
        Point { x: old_balance_receiver_ct.0.x, y: old_balance_receiver_ct.0.y },
        Point { x: old_balance_receiver_ct.1.x, y: old_balance_receiver_ct.1.y },
        Point { x: sender_pubkey.x, y: sender_pubkey.y },
        Point { x: old_balance_sender_ct.0.x, y: old_balance_sender_ct.0.y },
        Point { x: old_balance_sender_ct.1.x, y: old_balance_sender_ct.1.y },
        3
    );
}

#[test(should_fail)]
fn test_transfer_lying_about_balance_fails() {
    // Sender with 100 tokens claims a plaintext balance of 1000 - the embedding
    // check against the real ciphertext must reject the proof
    let sender_priv_key = 42;
    let sender_pubkey = public_key(sender_priv_key);
    let receiver_priv_key = 100;
    let receiver_pubkey = public_key(receiver_priv_key);

    let real_balance = 100;
    let claimed_balance = 1000;
    let transfer_amount = 500;

    let old_balance_sender_ct = encrypt(sender_pubkey, real_balance, 111);
    let old_balance_receiver_ct = encrypt(receiver_pubkey, 0, 333);

    let _ = main(
        sender_priv_key,
        transfer_amount,
        claimed_balance,
        222,
        444,
        7,
        11,
        Point { x: receiver_pubkey.x, y: receiver_pubkey.y },
        Point { x: old_balance_receiver_ct.0.x, y: old_balance_receiver_ct.0.y },
        Point { x: old_balance_receiver_ct.1.x, y: old_balance_receiver_ct.1.y },
        Point { x: sender_pubkey.x, y: sender_pubkey.y },
        Point { x: old_balance_sender_ct.0.x, y: old_balance_sender_ct.0.y },
        Point { x: old_balance_sender_ct.1.x, y: old_balance_sender_ct.1.y },
        3
    );
}
