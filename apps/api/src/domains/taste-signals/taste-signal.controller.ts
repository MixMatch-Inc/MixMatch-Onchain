import { Request, Response } from 'express';
import TasteSignal from './taste-signal.model';
import {
  createTasteSignalSchema,
  updateTasteSignalSchema,
  reorderTasteSignalsSchema,
} from './taste-signal.validation';

const serialize = (s: InstanceType<typeof TasteSignal>) => ({
  id: String(s._id),
  category: s.category,
  label: s.label,
  providerRef: s.providerRef,
  narrative: s.narrative,
  order: s.order,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

export const listTasteSignals = async (req: Request, res: Response): Promise<void> => {
  const signals = await TasteSignal.find({ owner: req.user!.userId }).sort({ order: 1 }).lean();
  res.status(200).json({ signals: signals.map(serialize as any) });
};

export const createTasteSignal = async (req: Request, res: Response): Promise<void> => {
  const parsed = createTasteSignalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    return;
  }

  const count = await TasteSignal.countDocuments({ owner: req.user!.userId });
  const signal = await TasteSignal.create({
    owner: req.user!.userId,
    order: parsed.data.order ?? count,
    ...parsed.data,
  });

  res.status(201).json({ signal: serialize(signal) });
};

export const updateTasteSignal = async (req: Request, res: Response): Promise<void> => {
  const parsed = updateTasteSignalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    return;
  }

  const signal = await TasteSignal.findOneAndUpdate(
    { _id: req.params.id, owner: req.user!.userId },
    { $set: parsed.data },
    { new: true },
  );

  if (!signal) {
    res.status(404).json({ message: 'Taste signal not found' });
    return;
  }

  res.status(200).json({ signal: serialize(signal) });
};

export const deleteTasteSignal = async (req: Request, res: Response): Promise<void> => {
  const signal = await TasteSignal.findOneAndDelete({
    _id: req.params.id,
    owner: req.user!.userId,
  });

  if (!signal) {
    res.status(404).json({ message: 'Taste signal not found' });
    return;
  }

  res.status(204).send();
};

export const reorderTasteSignals = async (req: Request, res: Response): Promise<void> => {
  const parsed = reorderTasteSignalsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
    return;
  }

  await Promise.all(
    parsed.data.signals.map(({ id, order }: { id: string; order: number }) =>
      TasteSignal.updateOne({ _id: id, owner: req.user!.userId }, { $set: { order } }),
    ),
  );

  res.status(204).send();
};
