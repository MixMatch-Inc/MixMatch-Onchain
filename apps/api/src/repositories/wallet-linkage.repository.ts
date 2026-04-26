import { IRepository } from './types';
import { IWalletLinkage } from '@mixmatch/types';

export interface IWalletLinkageRepository extends IRepository<IWalletLinkage, string> {
  findByUserId(userId: string): Promise<IWalletLinkage[]>;
}
