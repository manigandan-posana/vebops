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
  Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

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
    <Grid container sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Grid
        item
        xs={12}
        md={6}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, sm: 6, lg: 10 },
          py: { xs: 6, md: 12 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 440,
            p: { xs: 4, sm: 6 },
            borderRadius: 4,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            boxShadow: (theme) => `0px 30px 80px ${alpha(theme.palette.common.black, 0.08)}`,
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Box component="img" src="/VebOps.png" alt="VebOps" sx={{ width: 160, objectFit: 'contain' }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={600} color="text.primary">
                Welcome back
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                Sign in with your work email to continue to the VebOps workspace.
              </Typography>
            </Box>
            <Stack spacing={2.5} component="form" onSubmit={handleSubmit(onSubmit)}>
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
                placeholder="Enter your password"
                fullWidth
                autoComplete="current-password"
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                {...register('password')}
              />
              {error && (
                <Alert severity="error" variant="outlined">
                  Login failed. Please check your credentials.
                </Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isLoading || isSubmitting}
              >
                {isLoading || isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
              </Button>
            </Stack>
            <Divider flexItem>Single sign-on enabled</Divider>
            <Typography variant="caption" color="text.secondary">
              By continuing you agree to our Terms of Service and acknowledge the Privacy Policy.
            </Typography>
          </Stack>
        </Paper>
      </Grid>
      <Grid
        item
        md={6}
        sx={{
          display: { xs: 'none', md: 'flex' },
          alignItems: 'stretch',
          position: 'relative',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: (theme) => alpha(theme.palette.background.default, 0.2),
            backdropFilter: 'blur(2px)',
          }}
        />
        <Box
          component="img"
          src={SIDE_IMAGE}
          alt="Power lines under a blue sky"
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </Grid>
    </Grid>
  );
}
