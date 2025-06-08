use uuid::Uuid;

#[derive(Debug)]
pub struct PaymentRequest {
    pub amount: u64,
    pub currency: String,
    pub customer_id: String,
}

#[derive(Debug)]
pub struct PaymentIntent {
    pub payment_intent_id: String,
    pub status: String,
}

#[derive(Debug, thiserror::Error)]
pub enum PaymentError {
    #[error("Amount must be greater than 0")]
    InvalidAmount,
    #[error("Unsupported currency: {0}")]
    UnsupportedCurrency(String),
}

pub struct PaymentService;

impl PaymentService {
    const SUPPORTED_CURRENCIES: &'static [&'static str] = &["USD", "EUR", "GBP"];

    pub fn create_payment_intent(req: PaymentRequest) -> Result<PaymentIntent, PaymentError> {
        if req.amount == 0 {
            return Err(PaymentError::InvalidAmount);
        }

        if !Self::SUPPORTED_CURRENCIES.contains(&req.currency.as_str()) {
            return Err(PaymentError::UnsupportedCurrency(req.currency));
        }

        Ok(PaymentIntent {
            payment_intent_id: format!("pi_{}", Uuid::new_v4()),
            status: "created".to_string(),
        })
    }
}
