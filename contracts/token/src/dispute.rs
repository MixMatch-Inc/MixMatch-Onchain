use soroban_sdk::{contractimpl, Env, Address, Symbol, BytesN, Vec};
use crate::storage_types::{DataKey, Dispute};

pub struct DisputeResolution;

#[derive(Clone)]
pub struct Dispute {
    pub payment_id: u32,
    pub initiator: Address,
    pub respondent: Address,
    pub reason: Symbol,
    pub status: Symbol, // "open", "resolved", "canceled"
    pub resolver: Option<Address>,
    pub decision: Option<bool>, // true = for payer, false = for payee
    pub amount: i128,
    pub token_address: Address,
}

#[contractimpl]
impl DisputeResolution {
    pub fn open_dispute(
        env: Env,
        payment_id: u32,
        initiator: Address,
        respondent: Address,
        reason: Symbol,
        amount: i128,
        token_address: Address,
    ) -> u32 {
        initiator.require_auth();

        // Generate dispute ID
        let dispute_id = env.storage().get(&DataKey::DisputeCount).unwrap_or(0) + 1;
        env.storage().set(&DataKey::DisputeCount, &dispute_id);

        // Store dispute info
        let dispute_info = Dispute {
            payment_id,
            initiator: initiator.clone(),
            respondent,
            reason,
            status: Symbol::new(&env, "open"),
            resolver: None,
            decision: None,
            amount,
            token_address,
        };
        env.storage().set(&DataKey::Dispute(dispute_id), &dispute_info);

        dispute_id
    }

    pub fn resolve_dispute(
        env: Env,
        dispute_id: u32,
        resolver: Address,
        decision: bool,
    ) {
        resolver.require_auth();
        
        let mut dispute_info: Dispute = env.storage()
            .get(&DataKey::Dispute(dispute_id))
            .unwrap()
            .unwrap();

        assert!(
            dispute_info.status == Symbol::new(&env, "open"),
            "Dispute not open"
        );

        let token_client = crate::token::Client::new(&env, &dispute_info.token_address);

        // Execute resolution
        if decision {
            // Return funds to payer
            token_client.transfer(
                &env.current_contract_address(),
                &dispute_info.initiator,
                &dispute_info.amount,
            );
        } else {
            // Send funds to respondent
            token_client.transfer(
                &env.current_contract_address(),
                &dispute_info.respondent,
                &dispute_info.amount,
            );
        }

        // Update dispute status
        dispute_info.status = Symbol::new(&env, "resolved");
        dispute_info.resolver = Some(resolver);
        dispute_info.decision = Some(decision);
        env.storage().set(&DataKey::Dispute(dispute_id), &dispute_info);
    }

    pub fn get_dispute(env: Env, dispute_id: u32) -> Dispute {
        env.storage()
            .get(&DataKey::Dispute(dispute_id))
            .unwrap()
            .unwrap()
    }
}
