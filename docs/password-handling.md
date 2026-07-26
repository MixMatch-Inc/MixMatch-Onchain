# Password Handling

## Hashing
- Algorithm: bcrypt
- Rounds: 12
- Storage: passwordHash field in User table (never stored in plaintext)

## Validation Rules
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character (!@#$%^&*)

## Flow
1. User submits password via registration or login
2. Registration: password is hashed with bcrypt and stored
3. Login: submitted password is compared against stored hash
4. Response never reveals whether password was correct (generic error)

## Security Measures
- bcrypt adaptive hashing prevents rainbow table attacks
- Salt is generated automatically by bcrypt
- Timing-safe comparison prevents timing attacks
- No password hints or recovery questions stored
- Password change requires current password verification
