use soroban_sdk::{contractimpl, Env, Address, Vec, Map, Symbol};
use crate::storage_types::{DataKey, PaymentSplit};

pub struct PaymentSplitter;

#[derive(Clone)]
pub struct PaymentSplit {
    pub payer: Address,
    pub recipients: Map<Address, i128>, 
    pub total_amount: i128,
    pub distributed: bool,
    pub token_address: Address,
}

#[contractimpl]
impl PaymentSplitter {
    pub fn create_split(
        env: Env,
        payer: Address,
        recipients: Map<Address, i128>,
        total_amount: i128,
        token_address: Address,
    ) -> u32 {
        payer.require_auth();

        // Verify total percentages equal 100
        let mut total_percent = 0;
        for (_, percent) in recipients.iter() {
            total_percent += percent;
        }
        assert!(total_percent == 100, "Percentages must sum to 100");

        // Verify payer has sufficient balance
        let token_client = crate::token::Client::new(&env, &token_address);
        let payer_balance = token_client.balance(&payer);
        assert!(payer_balance >= total_amount, "Insufficient balance");

        // Generate split ID
        let split_id = env.storage().get(&DataKey::SplitCount).unwrap_or(0) + 1;
        env.storage().set(&DataKey::SplitCount, &split_id);

        // Store split info
        let split_info = PaymentSplit {
            payer,
            recipients,
            total_amount,
            distributed: false,
            token_address,
        };
        env.storage().set(&DataKey::Split(split_id), &split_info);

        split_id
    }

    pub fn distribute(env: Env, split_id: u32) {
        let mut split_info: PaymentSplit = env.storage()
            .get(&DataKey::Split(split_id))
            .unwrap()
            .unwrap();

        split_info.payer.require_auth();
        assert!(!split_info.distributed, "Already distributed");

        let token_client = crate::token::Client::new(&env, &split_info.token_address);

        // Transfer funds to each recipient
        for (recipient, percent) in split_info.recipients.iter() {
            let amount = split_info.total_amount * percent / 100;
            token_client.transfer(&split_info.payer, &recipient, &amount);
        }

        // Mark as distributed
        split_info.distributed = true;
        env.storage().set(&DataKey::Split(split_id), &split_info);
    }

    pub fn get_split(env: Env, split_id: u32) -> PaymentSplit {
        env.storage()
            .get(&DataKey::Split(split_id))
            .unwrap()
            .unwrap()
    }
}