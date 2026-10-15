// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { 
  getProfileColumns, 
  validateEmail, 
  isValidTask, 
  mapTask 
} from '../dataService';

describe('dataService utilities', () => {
  describe('getProfileColumns', () => {
    it('should return full columns when level is full', () => {
      const columns = getProfileColumns('full');
      expect(columns).toContain('disabled_at');
      expect(columns).toContain('status');
    });

    it('should return safe columns when level is safe', () => {
      const columns = getProfileColumns('safe');
      expect(columns).toContain('status');
      expect(columns).not.toContain('disabled_at');
    });

    it('should return base columns when level is base', () => {
      const columns = getProfileColumns('base');
      expect(columns).toContain('id');
      expect(columns).toContain('full_name');
      expect(columns).not.toContain('status');
    });

    it('should return min columns when level is min', () => {
      const columns = getProfileColumns('min');
      expect(columns).toBe('id,full_name,email,role,created_at');
    });

    it('should return min columns for unknown level', () => {
      const columns = getProfileColumns('unknown');
      expect(columns).toBe('id,full_name,email,role,created_at');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@sub.domain.com')).toBe(true);
      expect(validateEmail('user@localhost')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@.com')).toBe(false);
      expect(validateEmail('user domain@test.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
    });
  });

  describe('isValidTask', () => {
    it('should validate complete task', () => {
      const task = {
        title: 'Test Task',
        subject: 'Math',
        date: '2026-12-31',
        time: '10:00',
        priority: 'Media',
        reminder: '30 minutos antes',
      };
      expect(isValidTask(task)).toBe(true);
    });

    it('should reject task with empty title', () => {
      const task = {
        title: '',
        subject: 'Math',
        date: '2026-12-31',
        time: '10:00',
        priority: 'Media',
        reminder: '30 minutos antes',
      };
      expect(isValidTask(task)).toBe(false);
    });

    it('should reject task with invalid priority', () => {
      const task = {
        title: 'Test Task',
        subject: 'Math',
        date: '2026-12-31',
        time: '10:00',
        priority: 'Invalid',
        reminder: '30 minutos antes',
      };
      expect(isValidTask(task)).toBe(false);
    });

    it('should accept task with whitespace in title and subject', () => {
      const task = {
        title: '  Test Task  ',
        subject: '  Math  ',
        date: '2026-12-31',
        time: '10:00',
        priority: 'Media',
        reminder: '30 minutos antes',
      };
      expect(isValidTask(task)).toBe(true);
    });
  });

  describe('mapTask', () => {
    it('should map task from database format to frontend format', () => {
      const dbTask = {
        id: 'task-123',
        user_id: 'user-456',
        assigned_by: 'user-789',
        title: 'Test Task',
        description: 'Test Description',
        subject: 'Math',
        date: '2026-12-31',
        time: '10:00',
        priority: 'Alta',
        reminder: '1 hora antes',
        completed: false,
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
        task_attachments: [
          { id: 'att-1', storage_path: 'path/to/file', file_name: 'file.jpg', content_type: 'image/jpeg' }
        ],
      };

      const mapped = mapTask(dbTask);
      expect(mapped.id).toBe('task-123');
      expect(mapped.userId).toBe('user-456');
      expect(mapped.assignedBy).toBe('user-789');
      expect(mapped.title).toBe('Test Task');
      expect(mapped.description).toBe('Test Description');
      expect(mapped.subject).toBe('Math');
      expect(mapped.date).toBe('2026-12-31');
      expect(mapped.time).toBe('10:00');
      expect(mapped.priority).toBe('Alta');
      expect(mapped.reminder).toBe('1 hora antes');
      expect(mapped.completed).toBe(false);
      expect(mapped.attachments).toEqual([
        { id: 'att-1', storage_path: 'path/to/file', file_name: 'file.jpg', content_type: 'image/jpeg' }
      ]);
    });

    it('should handle null description', () => {
      const dbTask = {
        id: 'task-123',
        user_id: 'user-456',
        title: 'Test Task',
        description: null,
        subject: 'Math',
        date: '2026-12-31',
        time: '10:00',
        priority: 'Media',
        reminder: '30 minutos antes',
        completed: false,
      };

      const mapped = mapTask(dbTask);
      expect(mapped.description).toBe('');
    });

    it('should handle missing task_attachments', () => {
      const dbTask = {
        id: 'task-123',
        user_id: 'user-456',
        title: 'Test Task',
        subject: 'Math',
        date: '2026-12-31',
        time: '10:00',
        priority: 'Media',
        reminder: '30 minutos antes',
        completed: false,
      };

      const mapped = mapTask(dbTask);
      expect(mapped.attachments).toEqual([]);
    });
  });
});
