import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLoginMutation } from '../../features/auth/authApi';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Grid,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(4, 'Password required'),
});

export default function Login(){
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });
  const [login, { isLoading, error }] = useLoginMutation();
  const nav = useNavigate();
  const loc = useLocation();
  const auth = useSelector(s => s.auth);

  const SIDE_IMAGE =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC86RzcYV65UFbzxDZ1vvNAgySZHvyt2tx7Ddpxc_ivtf8JIFNavoztyymZ6_NltC7eLXH2ysy06H5qs_swubQxL_N8eTXQMmkpnC0kKG1bZfrGJU6_89_7s8-fGS2Y9JzhQ-D7lxZ0ICBQ_nIkbfzEN4RuNq_0FvqQ6gKvMXjYSTNX-UP17KNHmxGoSyZGpYxq7CLbyIs1L7aehOX0rmINMN04eR9UQaEC8s0-dYzwwlzdSQIoSuUPWXHOpaUdPjDQ_3MOp1Ft1Y';

  const onSubmit = async (data) => {
    const res = await login(data);
    if (res?.error) return;
    const role = res?.data?.role || auth?.role || 'BACK_OFFICE';
    if (role === 'ADMIN') nav('/admin/dashboard', { replace: true });
    else if (role === 'BACK_OFFICE' || role === 'OFFICE') nav('/office/dashboard', { replace: true });
    else if (role === 'FE') nav('/fe/assigned', { replace: true });
    else if (role === 'CUSTOMER') nav('/customer/proposals', { replace: true });
    else nav((loc.state?.from?.pathname) || '/office/dashboard', { replace: true });
  };

  return (
    <Grid container sx={{ minHeight: '100vh' }}>
      <Grid item xs={12} md={5} lg={4} sx={{ display: 'flex', alignItems: 'stretch' }}>
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: { xs: 3, sm: 6, lg: 8 },
            py: { xs: 6, md: 10 },
            background: 'linear-gradient(180deg, rgba(15,124,125,0.05) 0%, rgba(27,77,140,0.08) 100%)',
          }}
        >
          <Paper elevation={0} sx={{ p: { xs: 4, sm: 5 }, width: '100%', maxWidth: 420, borderRadius: 4 }}>
            <Stack spacing={3}>
              <Box component="img" src="/VebOps.png" alt="VebOps" sx={{ width: 180, objectFit: 'contain' }} />
              <Box>
                <Typography variant="h4" fontWeight={600} color="text.primary">
                  Sign in to your account
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Welcome back! Please enter your details to access your Vebops dashboard.
                </Typography>
              </Box>
              <Stack component="form" spacing={2.5} onSubmit={handleSubmit(onSubmit)}>
                <TextField
                  label="Email address"
                  placeholder="you@company.com"
                  type="email"
                  fullWidth
                  autoComplete="email"
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
                  {...register('email')}
                />
                <TextField
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  fullWidth
                  autoComplete="current-password"
                  error={Boolean(errors.password)}
                  helperText={errors.password?.message}
                  {...register('password')}
                />
                {error && (
                  <Alert severity="error" variant="outlined">
                    Login failed
                  </Alert>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={isLoading || isSubmitting}
                  sx={{ py: 1.5, borderRadius: 2, boxShadow: '0px 16px 32px rgba(27,77,140,0.25)' }}
                >
                  {isLoading || isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Grid>
      <Grid
        item
        md={7}
        lg={8}
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(27,77,140,0.35) 0%, rgba(15,124,125,0.35) 100%)',
        }}
      >
        <Box
          component="img"
          src={SIDE_IMAGE}
          alt="Power lines under a blue sky"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </Grid>
    </Grid>
  );
}
