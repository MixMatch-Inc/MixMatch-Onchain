# Password Handling Integration Framework

This document outlines the implementation strategy for password mutations across the `auth-first` architecture layer. Use these guidelines to ensure consistency across parallel features.

## Core Principles
1. **Never Save Plain Text:** Raw passwords must never bypass the network border un-hashed.
2. **Deterministic Processing:** Always pass string parameters directly through `PasswordUtil` before passing them to internal repositories or entities.

## Standard Usage Blueprint

### User Registration Workflow
When building out future registration endpoints or modules, intercept the plain password immediately within your service layer:

```typescript
import { PasswordUtil } from '../utils/password.util';

async function createUserProfile(dto: RegisterUserDto) {
  // Hash the plain password before assigning it to the database entity
  const secureHash = await PasswordUtil.hashPassword(dto.password);
  
  const newUser = this.userRepository.create({
    email: dto.email,
    passwordHash: secureHash,
  });
  
  return await this.userRepository.save(newUser);
}