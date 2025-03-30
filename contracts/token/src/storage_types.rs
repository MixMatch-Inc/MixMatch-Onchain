use soroban_sdk::{contracttype, Address};

pub(crate) const DAY_IN_LEDGERS: u32 = 17280;
pub(crate) const INSTANCE_BUMP_AMOUNT: u32 = 7 * DAY_IN_LEDGERS;
pub(crate) const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

pub(crate) const BALANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
pub(crate) const BALANCE_LIFETIME_THRESHOLD: u32 = BALANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

#[derive(Clone)]
#[contracttype]
pub struct AllowanceDataKey {
    pub from: Address,
    pub spender: Address,
}

#[contracttype]
pub struct AllowanceValue {
    pub amount: i128,
    pub expiration_ledger: u32,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Allowance(AllowanceDataKey),
    Balance(Address),
    Nonce(Address),
    State(Address),
    Admin,
}


use soroban_sdk::{Address, Symbol, Map, Vec};

pub enum DataKey {
    // Existing keys...
    EscrowCount,
    Escrow(u32),
    RecurringCount,
    Recurring(u32),
    SplitCount,
    Split(u32),
    DisputeCount,
    Dispute(u32),
    RecordCount,
    PaymentRecord(u32),
    UserStats(Address),
}

// Add these structs
#[derive(Clone)]
pub struct EscrowInfo {
    pub sender: Address,
    pub receiver: Address,
    pub amount: i128,
    pub condition: Symbol,
    pub released: bool,
    pub refunded: bool,
}

#[derive(Clone)]
pub struct RecurringPayment {
    pub payer: Address,
    pub payee: Address,
    pub amount: i128,
    pub interval: u64,
    pub next_payment: u64,
    pub iterations: u32,
    pub completed: u32,
    pub token_address: Address,
}

#[derive(Clone)]
pub struct PaymentSplit {
    pub payer: Address,
    pub recipients: Map<Address, i128>,
    pub total_amount: i128,
    pub distributed: bool,
    pub token_address: Address,
}

#[derive(Clone)]
pub struct Dispute {
    pub payment_id: u32,
    pub initiator: Address,
    pub respondent: Address,
    pub reason: Symbol,
    pub status: Symbol,
    pub resolver: Option<Address>,
    pub decision: Option<bool>,
    pub amount: i128,
    pub token_address: Address,
}

#[derive(Clone)]
pub struct PaymentRecord {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub timestamp: u64,
    pub token_address: Address,
    pub payment_type: Symbol,
}
