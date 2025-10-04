
#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol,
    token::{self, TokenClient},
};

const ADMIN: Symbol = symbol_short!("ADMIN");
const PRICE: Symbol = symbol_short!("PRICE");
const TOKEN: Symbol = symbol_short!("TOKEN");
const SUBS: Symbol = symbol_short!("SUBS");

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Subscription {
    pub subscriber: Address,
    pub tier: Symbol,
    pub expiry_timestamp: u64,
}

#[contract]
pub struct SubscriptionContract;

#[contractimpl]
impl SubscriptionContract {
    
    
    
    
    
    
    
    
    pub fn initialize(env: Env, admin: Address, token: Address, price: u128) {
    
        if env.storage().instance().has(&ADMIN) {
            panic!("Contract already initialized");
        }

    
    
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&TOKEN, &token);
        env.storage().instance().set(&PRICE, &price);
        
    
        env.storage().persistent().set(&SUBS, &soroban_sdk::Map::<Address, Subscription>::new(&env));
    }

    
    
    
    
    pub fn subscribe(env: Env, subscriber: Address) {
    
        subscriber.require_auth();

    
        let token_address: Address = env.storage().instance().get(&TOKEN).expect("Token not set");
        let price: u128 = env.storage().instance().get(&PRICE).expect("Price not set");
        let contract_address = env.current_contract_address();

    
        let token_client = TokenClient::new(&env, &token_address);
        
    
        token_client.transfer(&subscriber, &contract_address, &(price as i128));

    
        let mut subscriptions: soroban_sdk::Map<Address, Subscription> = 
            env.storage().persistent().get(&SUBS).expect("Subscriptions not initialized");

    
    
        let expiry_timestamp = env.ledger().timestamp() + (30 * 24 * 60 * 60);

    
        let new_subscription = Subscription {
            subscriber: subscriber.clone(),
            tier: symbol_short!("premium"),
            expiry_timestamp,
        };

    
        subscriptions.set(subscriber.clone(), new_subscription);
        env.storage().persistent().set(&SUBS, &subscriptions);

    
    
        env.events().publish(
            (symbol_short!("sub"), symbol_short!("new")),
            (subscriber, expiry_timestamp),
        );
    }

    
    
    
    
    pub fn get_subscription(env: Env, subscriber: Address) -> Option<Subscription> {
        let subscriptions: soroban_sdk::Map<Address, Subscription> = 
            env.storage().persistent().get(&SUBS).expect("Subscriptions not initialized");
            
        subscriptions.get(subscriber)
    }

    
    
    
    
    pub fn is_active(env: Env, subscriber: Address) -> bool {
        let subscriptions: soroban_sdk::Map<Address, Subscription> = 
            env.storage().persistent().get(&SUBS).expect("Subscriptions not initialized");

        if let Some(subscription) = subscriptions.get(subscriber) {
        
            return env.ledger().timestamp() < subscription.expiry_timestamp;
        }
        
        false
    }
    
    

    
    
    pub fn set_price(env: Env, new_price: u128) {
        let admin: Address = env.storage().instance().get(&ADMIN).expect("Admin not set");
        admin.require_auth();
        
        env.storage().instance().set(&PRICE, &new_price);
    }
    
    
    
    pub fn withdraw(env: Env, amount: u128) {
        let admin: Address = env.storage().instance().get(&ADMIN).expect("Admin not set");
        admin.require_auth();
        
        let token_address: Address = env.storage().instance().get(&TOKEN).expect("Token not set");
        let contract_address = env.current_contract_address();

        let token_client = TokenClient::new(&env, &token_address);
        token_client.transfer(&contract_address, &admin, &(amount as i128));
    }
}