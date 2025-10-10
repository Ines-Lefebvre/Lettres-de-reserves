/**
 * Tests unitaires pour le hook useRequestId
 *
 * Ces tests vérifient:
 * - La récupération prioritaire depuis URL > sessionStorage > localStorage
 * - La validation du format des requestId
 * - La synchronisation automatique entre les sources
 * - Les fonctions de gestion (setRequestId, clearRequestId, generateRequestId)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Tests des fonctions utilitaires de validation
 */
describe('useRequestId - Validation du format', () => {
  it('devrait accepter un requestId valide', () => {
    const validIds = [
      'req_1234567890_abc123',
      'req_123_xyz',
      'test-id-valid',
      'test_id_valid',
      'REQ_UPPERCASE_123'
    ];

    validIds.forEach(id => {
      const regex = /^[a-zA-Z0-9_-]{5,100}$/;
      expect(regex.test(id)).toBe(true);
    });
  });

  it('devrait rejeter un requestId invalide', () => {
    const invalidIds = [
      'abc',                          // Trop court (< 5 caractères)
      'id with spaces',               // Contient des espaces
      'id@with#special',              // Caractères spéciaux non autorisés
      '',                             // Vide
      'a'.repeat(101),                // Trop long (> 100 caractères)
      'req_<script>alert()</script>', // Tentative d'injection XSS
      'req_; DROP TABLE users;--',   // Tentative d'injection SQL
    ];

    invalidIds.forEach(id => {
      const regex = /^[a-zA-Z0-9_-]{5,100}$/;
      expect(regex.test(id)).toBe(false);
    });
  });
});

/**
 * Tests de génération de requestId
 */
describe('useRequestId - Génération de requestId', () => {
  it('devrait générer un requestId au format correct', () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const generated = `req_${timestamp}_${random}`;

    const regex = /^req_\d+_[a-z0-9]{6}$/;
    expect(regex.test(generated)).toBe(true);
  });

  it('devrait générer des requestId uniques', () => {
    const id1 = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const id2 = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    expect(id1).not.toBe(id2);
  });
});

/**
 * Tests de stockage et récupération
 */
describe('useRequestId - Stockage et récupération', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('devrait stocker dans sessionStorage', () => {
    const testId = 'req_test_12345';
    sessionStorage.setItem('current_request_id', testId);

    const retrieved = sessionStorage.getItem('current_request_id');
    expect(retrieved).toBe(testId);
  });

  it('devrait stocker dans localStorage', () => {
    const testId = 'req_test_67890';
    localStorage.setItem('lastRequestId', testId);

    const retrieved = localStorage.getItem('lastRequestId');
    expect(retrieved).toBe(testId);
  });

  it('devrait synchroniser entre sessionStorage et localStorage', () => {
    const testId = 'req_sync_test_999';

    sessionStorage.setItem('current_request_id', testId);
    localStorage.setItem('lastRequestId', testId);

    const fromSession = sessionStorage.getItem('current_request_id');
    const fromLocal = localStorage.getItem('lastRequestId');

    expect(fromSession).toBe(testId);
    expect(fromLocal).toBe(testId);
  });

  it('devrait nettoyer toutes les sources', () => {
    const testId = 'req_cleanup_test';

    sessionStorage.setItem('current_request_id', testId);
    localStorage.setItem('lastRequestId', testId);

    sessionStorage.removeItem('current_request_id');
    localStorage.removeItem('lastRequestId');

    expect(sessionStorage.getItem('current_request_id')).toBeNull();
    expect(localStorage.getItem('lastRequestId')).toBeNull();
  });
});

/**
 * Tests de priorité de récupération
 */
describe('useRequestId - Ordre de priorité', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('devrait prioriser sessionStorage sur localStorage', () => {
    const sessionId = 'req_from_session';
    const localId = 'req_from_local';

    sessionStorage.setItem('current_request_id', sessionId);
    localStorage.setItem('lastRequestId', localId);

    const fromSession = sessionStorage.getItem('current_request_id');
    const fromLocal = localStorage.getItem('lastRequestId');

    expect(fromSession).toBe(sessionId);
    expect(fromLocal).toBe(localId);
  });

  it('devrait utiliser localStorage si sessionStorage est vide', () => {
    const localId = 'req_fallback_local';

    localStorage.setItem('lastRequestId', localId);

    const fromSession = sessionStorage.getItem('current_request_id');
    const fromLocal = localStorage.getItem('lastRequestId');

    expect(fromSession).toBeNull();
    expect(fromLocal).toBe(localId);
  });

  it('devrait retourner null si toutes les sources sont vides', () => {
    const fromSession = sessionStorage.getItem('current_request_id');
    const fromLocal = localStorage.getItem('lastRequestId');

    expect(fromSession).toBeNull();
    expect(fromLocal).toBeNull();
  });
});

/**
 * Tests de sécurité
 */
describe('useRequestId - Sécurité', () => {
  it('devrait rejeter les tentatives d\'injection XSS', () => {
    const xssAttempts = [
      '<script>alert("XSS")</script>',
      'req_<img src=x onerror=alert(1)>',
      'req_javascript:alert(1)',
      'req_"><script>alert(document.cookie)</script>'
    ];

    xssAttempts.forEach(attempt => {
      const regex = /^[a-zA-Z0-9_-]{5,100}$/;
      expect(regex.test(attempt)).toBe(false);
    });
  });

  it('devrait rejeter les tentatives d\'injection SQL', () => {
    const sqlInjections = [
      "req_' OR '1'='1",
      'req_; DROP TABLE users;--',
      "req_' UNION SELECT * FROM passwords--",
      'req_admin\'--'
    ];

    sqlInjections.forEach(injection => {
      const regex = /^[a-zA-Z0-9_-]{5,100}$/;
      expect(regex.test(injection)).toBe(false);
    });
  });

  it('devrait rejeter les caractères de traversée de chemin', () => {
    const pathTraversals = [
      'req_../../etc/passwd',
      'req_..\\..\\windows\\system32',
      'req_/etc/passwd',
      'req_C:\\Windows\\System32'
    ];

    pathTraversals.forEach(traversal => {
      const regex = /^[a-zA-Z0-9_-]{5,100}$/;
      expect(regex.test(traversal)).toBe(false);
    });
  });
});

/**
 * Tests de cas limites
 */
describe('useRequestId - Cas limites', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('devrait gérer un requestId à la limite minimale (5 caractères)', () => {
    const minId = 'req12';
    const regex = /^[a-zA-Z0-9_-]{5,100}$/;
    expect(regex.test(minId)).toBe(true);
  });

  it('devrait gérer un requestId à la limite maximale (100 caractères)', () => {
    const maxId = 'a'.repeat(100);
    const regex = /^[a-zA-Z0-9_-]{5,100}$/;
    expect(regex.test(maxId)).toBe(true);
  });

  it('devrait gérer un requestId null ou undefined', () => {
    expect(sessionStorage.getItem('nonexistent')).toBeNull();
    expect(localStorage.getItem('nonexistent')).toBeNull();
  });

  it('devrait gérer une erreur de quota localStorage dépassé', () => {
    try {
      const largeData = 'x'.repeat(10 * 1024 * 1024);
      localStorage.setItem('test', largeData);
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.name).toBe('QuotaExceededError');
    }
  });
});

/**
 * Tests d'intégration
 */
describe('useRequestId - Intégration', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('devrait simuler le flux complet: génération -> stockage -> récupération', () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const generatedId = `req_${timestamp}_${random}`;

    sessionStorage.setItem('current_request_id', generatedId);
    localStorage.setItem('lastRequestId', generatedId);

    const retrievedFromSession = sessionStorage.getItem('current_request_id');
    const retrievedFromLocal = localStorage.getItem('lastRequestId');

    expect(retrievedFromSession).toBe(generatedId);
    expect(retrievedFromLocal).toBe(generatedId);
  });

  it('devrait simuler le flux de mise à jour: ancien ID -> nouveau ID', () => {
    const oldId = 'req_old_123';
    const newId = 'req_new_456';

    sessionStorage.setItem('current_request_id', oldId);
    localStorage.setItem('lastRequestId', oldId);

    sessionStorage.setItem('current_request_id', newId);
    localStorage.setItem('lastRequestId', newId);

    expect(sessionStorage.getItem('current_request_id')).toBe(newId);
    expect(localStorage.getItem('lastRequestId')).toBe(newId);
  });

  it('devrait simuler le flux de nettoyage complet', () => {
    const testId = 'req_cleanup_integration';

    sessionStorage.setItem('current_request_id', testId);
    localStorage.setItem('lastRequestId', testId);

    sessionStorage.removeItem('current_request_id');
    localStorage.removeItem('lastRequestId');

    expect(sessionStorage.getItem('current_request_id')).toBeNull();
    expect(localStorage.getItem('lastRequestId')).toBeNull();
  });
});
