import { Router } from 'express'
import { pesagemService } from '../../services/pesagem.service.js'
import { asyncHandler } from '../middlewares/error.middleware.js'

const router = Router()

router.post('/', asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await pesagemService.registrar(req.body) })
}))

router.post('/lote', asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await pesagemService.registrarEmLote(req.body) })
}))

router.get('/animal/:animalId', asyncHandler(async (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { limite } = req.query as any
  res.json({ success: true, data: await pesagemService.historicoPorAnimal(( req.params["animalId"] as string), limite ? parseInt(limite) : 20) })
}))

router.get('/lote/:loteId', asyncHandler(async (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = req.query as any
  res.json({ success: true, data: await pesagemService.pesagensPorLote(( req.params["loteId"] as string), data) })
}))

export default router
