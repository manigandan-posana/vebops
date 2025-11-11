// src/views/office/Company.jsx
//
// Company profile editor presented with Material UI. It retains the existing
// persistence logic while providing a compact layout, responsive density and
// keyboard navigation that advances to the next field on Enter.

import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { UploadCloud } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGetCompanyQuery, useUpdateCompanyMutation } from '../../features/office/officeApi'
import { focusNextInputOnEnter } from '../../utils/enterKeyNavigation'


export default function Company () {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const { data: companyData = {}, isLoading } = useGetCompanyQuery()
  const [updateCompany, { isLoading: saving }] = useUpdateCompanyMutation()
  const [company, setCompany] = useState({})

  useEffect(() => {
    if (companyData) {
      const lines = []
      if (companyData.addressLines && Array.isArray(companyData.addressLines)) {
        lines.push(...companyData.addressLines)
      } else {
        if (companyData.addressLine1) lines[0] = companyData.addressLine1
        if (companyData.addressLine2) lines[1] = companyData.addressLine2
      }
      setCompany({ ...companyData, addressLines: lines })
    }
  }, [companyData])

  const onChange = (key) => (event) => {
    const value = event?.target?.value ?? event
    setCompany((c) => ({ ...c, [key]: value }))
  }

  const onAddressChange = (idx) => (event) => {
    const next = Array.isArray(company.addressLines) ? [...company.addressLines] : ['', '']
    next[idx] = event.target.value
    setCompany((c) => ({ ...c, addressLines: next }))
  }

  const onLogoFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      try {
        const img = new Image()
        img.onload = () => {
          const maxDim = 800
          let { width, height } = img
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              const ratio = maxDim / width
              width = maxDim
              height = height * ratio
            } else {
              const ratio = maxDim / height
              height = maxDim
              width = width * ratio
            }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL('image/png', 0.8)
          setCompany((c) => ({ ...c, logoDataUrl: compressed }))
        }
        img.onerror = () => setCompany((c) => ({ ...c, logoDataUrl: dataUrl }))
        img.src = dataUrl
      } catch (err) {
        setCompany((c) => ({ ...c, logoDataUrl: dataUrl }))
      }
    }
    reader.readAsDataURL(file)
  }

  const onSave = async () => {
    const payload = { ...company }
    if (Array.isArray(payload.addressLines)) {
      payload.addressLine1 = payload.addressLines[0] || ''
      payload.addressLine2 = payload.addressLines[1] || ''
    }
    if (typeof payload.logoDataUrl === 'string') {
      payload.logo = payload.logoDataUrl
    }
    try {
      await updateCompany(payload).unwrap()
      toast.success('Company details updated')
      navigate('/office/dashboard')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update company')
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant='body2'>Loading…</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100%', py: 3 }}>
      <Container maxWidth='lg'>
        <Stack spacing={3} component='form'>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
            <Box>
              <Typography variant='h5' fontWeight={600}>Company Settings</Typography>
              <Typography variant='body2' color='text.secondary'>Details used for invoices, proposals and statutory documents.</Typography>
            </Box>
            <Stack direction='row' spacing={1}>
              <Button variant='outlined' onClick={() => navigate(-1)}>Back</Button>
              <Button variant='contained' onClick={onSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </Stack>
          </Stack>

          <Grid container spacing={3} alignItems='flex-start'>
            <Grid item xs={12} md={4}>
              <Card variant='outlined' sx={{ borderRadius: 2 }}>
                <CardHeader title='Branding' subheader='Upload a square logo for invoice headers.' />
                <Divider />
                <CardContent>
                  <Stack spacing={2} alignItems='center'>
                    <Avatar
                      variant='rounded'
                      src={company.logoDataUrl || ''}
                      alt='Company logo'
                      sx={{ width: 160, height: 160, borderRadius: 3, bgcolor: 'background.paper', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}
                    >
                      {!company.logoDataUrl && <Typography variant='caption' color='text.secondary'>No logo</Typography>}
                    </Avatar>
                    <Stack direction='row' spacing={1} sx={{ width: '100%' }}>
                      <input ref={fileRef} type='file' accept='image/*' hidden onChange={onLogoFile} />
                      <Button
                        fullWidth
                        variant='outlined'
                        startIcon={<UploadCloud size={16} />}
                        onClick={() => fileRef.current?.click()}
                      >
                        Upload logo
                      </Button>
                      <Button fullWidth variant='outlined' color='inherit' onClick={() => setCompany((c) => ({ ...c, logoDataUrl: '' }))}>Clear</Button>
                    </Stack>
                    <Typography variant='caption' color='text.secondary'>Use a square PNG/JPG for the best print quality.</Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card variant='outlined' sx={{ borderRadius: 2 }}>
                <CardHeader title='Organisation details' />
                <Divider />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label='Company name'
                        value={company.name || ''}
                        onChange={onChange('name')}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label='Website'
                        value={company.website || ''}
                        onChange={onChange('website')}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label='Phone'
                        value={company.phone || ''}
                        onChange={onChange('phone')}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label='Email'
                        value={company.email || ''}
                        onChange={onChange('email')}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label='Address line 1'
                        value={company.addressLines?.[0] || ''}
                        onChange={onAddressChange(0)}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label='Address line 2'
                        value={company.addressLines?.[1] || ''}
                        onChange={onAddressChange(1)}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label='State'
                        value={company.state || ''}
                        onChange={onChange('state')}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label='State code'
                        value={company.stateCode || ''}
                        onChange={onChange('stateCode')}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label='GSTIN'
                        value={company.gstin || ''}
                        onChange={onChange('gstin')}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label='PAN'
                        value={company.pan || ''}
                        onChange={onChange('pan')}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label='Bank name'
                        value={company.bankName || ''}
                        onChange={onChange('bankName')}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label='Account number'
                        value={company.accNo || ''}
                        onChange={onChange('accNo')}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label='IFSC'
                        value={company.ifsc || ''}
                        onChange={onChange('ifsc')}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label='Branch'
                        value={company.branch || ''}
                        onChange={onChange('branch')}
                        onKeyDown={focusNextInputOnEnter}
                        size='small'
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                  <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 3 }}>
                    These details populate invoices, proposals and determine GST split calculations.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  )
}
