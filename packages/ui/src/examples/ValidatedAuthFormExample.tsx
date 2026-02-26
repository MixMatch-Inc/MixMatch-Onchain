import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';

const roleOptions = [
  { label: 'DJ', value: 'DJ' },
  { label: 'Organizer', value: 'PLANNER' },
  { label: 'Fan', value: 'MUSIC_LOVER' },
];

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['DJ', 'PLANNER', 'MUSIC_LOVER']),
});

type FormValues = z.infer<typeof schema>;

export const ValidatedAuthFormExample = (): React.ReactElement => {
  const form = useForm<FormValues>({
    mode: 'onSubmit',
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      role: 'DJ',
    },
  });

  const onSubmit = (_values: FormValues): void => {
    // Validation gate: this callback only runs when schema validation passes.
  };

  return (
    <form className="mx-auto flex max-w-md flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        error={form.formState.errors.password?.message}
        {...form.register('password')}
      />
      <Select
        label="Role"
        options={roleOptions}
        error={form.formState.errors.role?.message}
        {...form.register('role')}
      />
      <Button type="submit">Create account</Button>
    </form>
  );
};
