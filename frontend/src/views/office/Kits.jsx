// src/views/office/Kits.jsx
//
// Material UI version of kit management. Business logic for CRUD operations
// remains intact while the interface adopts a compact, professional layout with
// responsive density and keyboard navigation enhancements.

import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import { UploadCloud, Search as SearchIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  useBulkCreateKitsMutation,
  useCreateKitMutation,
  useDeleteKitMutation,
  useGetKitsQuery,
  useUpdateKitMutation
} from '../../features/office/officeApi'
import { focusNextInputOnEnter } from '../../utils/enterKeyNavigation'


const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number.isFinite(+n) ? +n : 0)

const SERVICE_TYPES = [
  { value: 'SUPPLY', label: 'Supply Only' },
  { value: 'SUPPLY_INSTALL', label: 'Supply & Install' },
  { value: 'INSTALL_ONLY', label: 'Install Only' },
  { value: 'ERECTION', label: 'Erection' }
]

export default function Kits () {
  const navigate = useNavigate()
  const { data: kits = [], isLoading } = useGetKitsQuery(undefined)
  const [createKit] = useCreateKitMutation()
  const [updateKit] = useUpdateKitMutation()
  const [deleteKit] = useDeleteKitMutation()
  const [bulkCreateKits] = useBulkCreateKitsMutation()

  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 20

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return kits
    return (kits || []).filter((k) => [k.name, k.serviceType, k.price, k.code, k.hsnSac, k.brand]
      .some((v) => String(v || '').toLowerCase().includes(q)))
  }, [kits, search])

  const paged = useMemo(() => {
    const start = page * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page])

  const totalPages = Math.ceil(filtered.length / pageSize) || 1

  const onSave = async () => {
    const form = editing
    if (!form?.name || !form?.serviceType) {
      toast.error('Name and service type are required')
      return
    }
    try {
      const payload = {
        name: form.name,
        serviceType: form.serviceType,
        price: Number(form.price || 0),
        description: form.description,
        code: form.code,
        hsnSac: form.hsnSac,
        brand: form.brand,
        voltageKV: form.voltageKV,
        cores: form.cores,
        sizeSqmm: form.sizeSqmm ? Number(form.sizeSqmm) : null,
        category: form.category,
        material: form.material
      }
      if (form.id) {
        await updateKit({ id: form.id, ...payload }).unwrap()
        toast.success('Kit updated')
      } else {
        await createKit(payload).unwrap()
        toast.success('Kit created')
      }
      setEditing(null)
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save kit')
    }
  }

  const onDelete = async (id) => {
    if (!window.confirm('Delete this kit?')) return
    try {
      await deleteKit(id).unwrap()
      toast.success('Kit deleted')
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete kit')
    }
  }

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const list = JSON.parse(text)
      if (!Array.isArray(list)) throw new Error('JSON must be an array of kits')
      const normalised = list.map((item) => {
        const price = item.price !== undefined && item.price !== null && item.price !== ''
          ? item.price
          : item.basePrice !== undefined && item.basePrice !== null && item.basePrice !== ''
            ? item.basePrice
            : 0
        return { ...item, price }
      })
      await bulkCreateKits(normalised).unwrap()
      toast.success('Kits imported')
    } catch (err) {
      console.error(err)
      toast.error('Failed to import kits')
    }
    event.target.value = ''
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100%', py: 3 }}>
      <Container maxWidth='lg'>
        <Stack spacing={2.5}>
          <Card variant='outlined' sx={{ borderRadius: 2 }}>
            <CardHeader
              title={<Typography variant='h5' fontWeight={600}>Kit Management</Typography>}
              subheader={<Typography variant='body2' color='text.secondary'>Manage catalogue items available during service creation.</Typography>}
              action={(
                <Stack direction='row' spacing={1}>
                  <Button variant='outlined' size='small' onClick={() => navigate('/office/service')}>
                    Back to service
                  </Button>
                  <Button
                    variant='contained'
                    size='small'
                    onClick={() => setEditing({
                      name: '',
                      serviceType: 'SUPPLY',
                      price: 0,
                      description: '',
                      code: '',
                      hsnSac: '854690',
                      brand: '',
                      voltageKV: '',
                      cores: '',
                      sizeSqmm: '',
                      category: '',
                      material: ''
                    })}
                  >
                    Add kit
                  </Button>
                  <Button
                    variant='outlined'
                    size='small'
                    startIcon={<UploadCloud size={16} />}
                    component='label'
                  >
                    Import JSON
                    <input type='file' accept='.json,application/json' hidden onChange={handleImport} />
                  </Button>
                </Stack>
              )}
            />
            <CardContent>
              <Grid container spacing={2} alignItems='center'>
                <Grid item xs={12} md={6}>
                  <TextField
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={focusNextInputOnEnter}
                    placeholder='Search kits'
                    size='small'
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position='start'>
                          <SearchIcon size={16} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6} textAlign={{ xs: 'left', md: 'right' }}>
                  <Typography variant='body2' color='text.secondary'>Total kits: {kits?.length || 0}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant='outlined' sx={{ borderRadius: 2 }}>
            <CardContent>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell width='12%'>Code</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell width='12%'>HSN/SAC</TableCell>
                      <TableCell width='14%'>Service type</TableCell>
                      <TableCell align='right' width='14%'>Price</TableCell>
                      <TableCell align='right' width='16%'>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paged.map((kit) => (
                      <TableRow hover key={kit.id}>
                        <TableCell><Typography variant='body2'>{kit.code}</Typography></TableCell>
                        <TableCell><Typography variant='body2' fontWeight={600}>{kit.name}</Typography></TableCell>
                        <TableCell><Typography variant='body2'>{kit.hsnSac || '854690'}</Typography></TableCell>
                        <TableCell><Typography variant='body2'>{kit.serviceType}</Typography></TableCell>
                        <TableCell align='right'><Typography variant='body2' fontWeight={600}>{fmtINR(kit.price)}</Typography></TableCell>
                        <TableCell align='right'>
                          <Stack direction='row' spacing={1} justifyContent='flex-end'>
                            <Button
                              size='small'
                              variant='outlined'
                              onClick={() => setEditing({
                                id: kit.id,
                                name: kit.name,
                                serviceType: kit.serviceType,
                                price: kit.price,
                                description: kit.description,
                                code: kit.code,
                                hsnSac: kit.hsnSac || '854690',
                                brand: kit.brand || '',
                                voltageKV: kit.voltageKV || '',
                                cores: kit.cores || '',
                                sizeSqmm: kit.sizeSqmm || '',
                                category: kit.category || '',
                                material: kit.material || ''
                              })}
                            >
                              Edit
                            </Button>
                            <Button
                              size='small'
                              variant='outlined'
                              color='error'
                              onClick={() => onDelete(kit.id)}
                            >
                              Delete
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={6} align='center'>
                          <Typography variant='body2' color='text.secondary'>No kits found.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ xs: 'flex-start', sm: 'center' }} mt={2}>
                <Typography variant='body2' color='text.secondary'>Page {page + 1} of {totalPages}</Typography>
                <Stack direction='row' spacing={1}>
                  <Button size='small' variant='outlined' disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
                  <Button size='small' variant='outlined' disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>Next</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth='sm' fullWidth>
        <DialogTitle>{editing?.id ? 'Edit kit' : 'Add kit'}</DialogTitle>
        <DialogContent dividers>
          {editing && (
            <Stack spacing={2} component='form'>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Code'
                    value={editing.code}
                    onChange={(event) => setEditing((f) => ({ ...f, code: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='HSN / SAC'
                    value={editing.hsnSac}
                    onChange={(event) => setEditing((f) => ({ ...f, hsnSac: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label='Name'
                    value={editing.name}
                    onChange={(event) => setEditing((f) => ({ ...f, name: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label='Service type'
                    value={editing.serviceType}
                    onChange={(event) => setEditing((f) => ({ ...f, serviceType: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                    fullWidth
                  >
                    {SERVICE_TYPES.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Price (₹)'
                    type='number'
                    value={editing.price}
                    onChange={(event) => setEditing((f) => ({ ...f, price: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                    fullWidth
                    InputProps={{ inputProps: { min: 0, step: 100 } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label='Description'
                    value={editing.description || ''}
                    onChange={(event) => setEditing((f) => ({ ...f, description: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                    fullWidth
                    multiline
                    minRows={3}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Brand'
                    value={editing.brand}
                    onChange={(event) => setEditing((f) => ({ ...f, brand: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Voltage (kV)'
                    value={editing.voltageKV}
                    onChange={(event) => setEditing((f) => ({ ...f, voltageKV: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Cores'
                    value={editing.cores}
                    onChange={(event) => setEditing((f) => ({ ...f, cores: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Size (sqmm)'
                    type='number'
                    value={editing.sizeSqmm}
                    onChange={(event) => setEditing((f) => ({ ...f, sizeSqmm: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                    fullWidth
                    InputProps={{ inputProps: { min: 0, step: 1 } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Category'
                    value={editing.category}
                    onChange={(event) => setEditing((f) => ({ ...f, category: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label='Material'
                    value={editing.material}
                    onChange={(event) => setEditing((f) => ({ ...f, material: event.target.value }))}
                    onKeyDown={focusNextInputOnEnter}
                    size='small'
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} color='inherit'>Cancel</Button>
          <Button onClick={onSave} variant='contained'>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
