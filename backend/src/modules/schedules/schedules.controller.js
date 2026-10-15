import {
  createScheduleSchema,
  updateScheduleSchema,
  createAssignmentSchema,
  updateAssignmentStatusSchema,
  confirmAssignmentSchema,
} from './schedules.validation.js';
import * as schedulesService from './schedules.service.js';
import { AppError } from '../../utils/AppError.js';

export async function listSchedulesController(req, res, next) {
  try {
    const schedules = await schedulesService.listSchedules(req.user);
    res.status(200).json({ schedules });
  } catch (err) {
    next(err);
  }
}

export async function getScheduleController(req, res, next) {
  try {
    const schedule = await schedulesService.getScheduleById(req.params.id, req.user);
    res.status(200).json({ schedule });
  } catch (err) {
    next(err);
  }
}

export async function createScheduleController(req, res, next) {
  try {
    const parsed = createScheduleSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const schedule = await schedulesService.createSchedule(parsed.data, req.user, req.ip);
    res.status(201).json({ schedule });
  } catch (err) {
    next(err);
  }
}

export async function updateScheduleController(req, res, next) {
  try {
    const parsed = updateScheduleSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const schedule = await schedulesService.updateSchedule(req.params.id, parsed.data, req.user, req.ip);
    res.status(200).json({ schedule });
  } catch (err) {
    next(err);
  }
}

export async function deleteScheduleController(req, res, next) {
  try {
    await schedulesService.deleteSchedule(req.params.id, req.user, req.ip);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function addAssignmentController(req, res, next) {
  try {
    const parsed = createAssignmentSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const assignment = await schedulesService.addAssignment(req.params.id, parsed.data, req.user, req.ip);
    res.status(201).json({ assignment });
  } catch (err) {
    next(err);
  }
}

export async function removeAssignmentController(req, res, next) {
  try {
    await schedulesService.removeAssignment(req.params.id, req.params.assignmentId, req.user, req.ip);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function updateAssignmentStatusController(req, res, next) {
  try {
    const parsed = updateAssignmentStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const assignment = await schedulesService.updateAssignmentStatus(
      req.params.id,
      req.params.assignmentId,
      parsed.data,
      req.user,
      req.ip
    );
    res.status(200).json({ assignment });
  } catch (err) {
    next(err);
  }
}

// Confirmação/recusa pelo próprio obreiro
export async function confirmAssignmentController(req, res, next) {
  try {
    const parsed = confirmAssignmentSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const assignment = await schedulesService.confirmOwnAssignment(
      req.params.id,
      req.params.assignmentId,
      parsed.data,
      req.user,
      req.ip
    );
    res.status(200).json({ assignment });
  } catch (err) {
    next(err);
  }
}
