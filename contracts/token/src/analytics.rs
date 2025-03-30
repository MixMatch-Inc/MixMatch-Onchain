use soroban_sdk::{contractimpl, Env, Address, Map, Symbol, Vec};
use crate::storage_types::{DataKey, PaymentRecord};

pub struct PaymentAnalytics;

#[derive(Clone)]
pub struct PaymentRecord {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub timestamp: u64,
    pub token_address: Address,
    pub payment_type: Symbol, // "regular", "escrow", "recurring", "split"
}

#[contractimpl]
impl PaymentAnalytics {
    pub fn record_payment(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
        token_address: Address,
        payment_type: Symbol,
    ) {
        // Generate record ID
        let record_id = env.storage().get(&DataKey::RecordCount).unwrap_or(0) + 1;
        env.storage().set(&DataKey::RecordCount, &record_id);

        // Store payment record
        let record = PaymentRecord {
            from,
            to,
            amount,
            timestamp: env.ledger().timestamp(),
            token_address,
            payment_type,
        };
        env.storage().set(&DataKey::PaymentRecord(record_id), &record);

        // Update user stats
        Self::update_user_stats(&env, &from, &to, amount);
    }

    fn update_user_stats(env: &Env, from: &Address, to: &Address, amount: i128) {
        // Update sender stats
        let mut sender_stats: Map<Symbol, i128> = env.storage()
            .get(&DataKey::UserStats(from.clone()))
            .unwrap_or(Map::new(env));
        
        let total_sent = sender_stats.get(Symbol::new(env, "total_sent")).unwrap_or(0) + amount;
        sender_stats.set(Symbol::new(env, "total_sent"), total_sent);
        env.storage().set(&DataKey::UserStats(from.clone()), &sender_stats);

        // Update receiver stats
        let mut receiver_stats: Map<Symbol, i128> = env.storage()
            .get(&DataKey::UserStats(to.clone()))
            .unwrap_or(Map::new(env));
        
        let total_received = receiver_stats.get(Symbol::new(env, "total_received")).unwrap_or(0) + amount;
        receiver_stats.set(Symbol::new(env, "total_received"), total_received);
        env.storage().set(&DataKey::UserStats(to.clone()), &receiver_stats);
    }

    pub fn get_stats(env: Env, address: Address) -> Map<Symbol, i128> {
        env.storage()
            .get(&DataKey::UserStats(address))
            .unwrap_or(Map::new(&env))
    }

    pub fn get_history(env: Env, address: Address, limit: u32) -> Vec<u32> {
        let mut result = Vec::new(&env);
        let record_count = env.storage().get(&DataKey::RecordCount).unwrap_or(0);
        
        // Simple implementation - in production you'd want indexing
        for i in 1..=record_count {
            if result.len() >= limit as usize {
                break;
            }
            
            let record: PaymentRecord = env.storage()
                .get(&DataKey::PaymentRecord(i))
                .unwrap()
                .unwrap();
                
            if record.from == address || record.to == address {
                result.push_back(i);
            }
        }
        
        result
    }
}
