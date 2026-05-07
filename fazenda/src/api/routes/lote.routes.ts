import { Router } from 'express'
import { loteRepository }   from '../../repositories/lote.repository.js'
import { animalRepository } from '../../repositories/animal.repository.js'
import { asyncHandler }     from '../middlewares/error.middleware.js'

const router = Router()

router.get('/',    asyncHandler(async (_req, res) => { res.json({ success: true, data: await loteRepository.findAll() }) }))

router.get('/:id', asyncHandler(async (req, res) => {
  const lote = await loteRepository.findById(( req.params["id"] as string))
  if (!lote) { res.status(404).json({ success: false, message: 'Lote não encontrado' }); return }
  res.json({ success: true, data: lote })
}))

router.get('/:id/animais', asyncHandler(async (req, res) => {
  res.json({ success: true, data: await animalRepository.findByLote(( req.params["id"] as string)) })
}))

router.post('/', asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await loteRepository.create(req.body) })
}))

router.patch('/:id', asyncHandler(async (req, res) => {
  const lote = await loteRepository.update(( req.params["id"] as string), req.body)
  if (!lote) { res.status(404).json({ success: false, message: 'Lote não encontrado' }); return }
  res.json({ success: true, data: lote })
}))

export default router
