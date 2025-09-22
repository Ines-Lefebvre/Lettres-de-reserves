import { describe, it, expect } from 'vitest';
import { dotObjectToNested, nestedToDotObject, cleanData } from './normalize';

describe('normalize utilities', () => {
  describe('dotObjectToNested', () => {
    it('should convert dot notation to nested object', () => {
      const input = {
        'employeur.siret': '12345678901234',
        'victime.nom': 'MARTIN',
        'accident.date': '2025-01-15'
      };
      
      const expected = {
        employeur: { siret: '12345678901234' },
        victime: { nom: 'MARTIN' },
        accident: { date: '2025-01-15' }
      };
      
      expect(dotObjectToNested(input)).toEqual(expected);
    });

    it('should handle empty input', () => {
      expect(dotObjectToNested({})).toEqual({});
      expect(dotObjectToNested(null as any)).toEqual({});
      expect(dotObjectToNested(undefined as any)).toEqual({});
    });

    it('should ignore keys without dots', () => {
      const input = {
        'employeur.siret': '12345',
        'invalidkey': 'should be ignored',
        'victime.nom': 'MARTIN'
      };
      
      const expected = {
        employeur: { siret: '12345' },
        victime: { nom: 'MARTIN' }
      };
      
      expect(dotObjectToNested(input)).toEqual(expected);
    });

    it('should handle multiple fields in same section', () => {
      const input = {
        'employeur.siret': '12345',
        'employeur.nom': 'ACME Corp',
        'employeur.adresse': '123 Rue Test'
      };
      
      const expected = {
        employeur: {
          siret: '12345',
          nom: 'ACME Corp',
          adresse: '123 Rue Test'
        }
      };
      
      expect(dotObjectToNested(input)).toEqual(expected);
    });

    it('should handle various data types', () => {
      const input = {
        'section.string': 'text',
        'section.number': 123,
        'section.boolean': true,
        'section.null': null,
        'section.array': [1, 2, 3]
      };
      
      const expected = {
        section: {
          string: 'text',
          number: 123,
          boolean: true,
          null: null,
          array: [1, 2, 3]
        }
      };
      
      expect(dotObjectToNested(input)).toEqual(expected);
    });
  });

  describe('nestedToDotObject', () => {
    it('should convert nested object to dot notation', () => {
      const input = {
        employeur: { siret: '12345678901234' },
        victime: { nom: 'MARTIN' },
        accident: { date: '2025-01-15' }
      };
      
      const expected = {
        'employeur.siret': '12345678901234',
        'victime.nom': 'MARTIN',
        'accident.date': '2025-01-15'
      };
      
      expect(nestedToDotObject(input)).toEqual(expected);
    });

    it('should handle empty input', () => {
      expect(nestedToDotObject({})).toEqual({});
      expect(nestedToDotObject(null as any)).toEqual({});
      expect(nestedToDotObject(undefined as any)).toEqual({});
    });

    it('should preserve non-object values at root level', () => {
      const input = {
        employeur: { siret: '12345' },
        simpleValue: 'test',
        numberValue: 42
      };
      
      const expected = {
        'employeur.siret': '12345',
        simpleValue: 'test',
        numberValue: 42
      };
      
      expect(nestedToDotObject(input)).toEqual(expected);
    });

    it('should handle multiple nested fields', () => {
      const input = {
        employeur: {
          siret: '12345',
          nom: 'ACME Corp',
          adresse: '123 Rue Test'
        }
      };
      
      const expected = {
        'employeur.siret': '12345',
        'employeur.nom': 'ACME Corp',
        'employeur.adresse': '123 Rue Test'
      };
      
      expect(nestedToDotObject(input)).toEqual(expected);
    });

    it('should handle arrays and null values', () => {
      const input = {
        section: {
          array: [1, 2, 3],
          null: null,
          string: 'test'
        }
      };
      
      const expected = {
        'section.array': [1, 2, 3],
        'section.null': null,
        'section.string': 'test'
      };
      
      expect(nestedToDotObject(input)).toEqual(expected);
    });
  });

  describe('cleanData', () => {
    it('should remove null, undefined and empty string values', () => {
      const input = {
        valid: 'value',
        null: null,
        undefined: undefined,
        empty: '',
        zero: 0,
        false: false
      };
      
      const expected = {
        valid: 'value',
        zero: 0,
        false: false
      };
      
      expect(cleanData(input)).toEqual(expected);
    });

    it('should handle nested objects', () => {
      const input = {
        section1: {
          valid: 'value',
          empty: '',
          null: null
        },
        section2: {
          another: 'test',
          undefined: undefined
        },
        emptySection: {
          null: null,
          empty: ''
        }
      };
      
      const expected = {
        section1: {
          valid: 'value'
        },
        section2: {
          another: 'test'
        }
      };
      
      expect(cleanData(input)).toEqual(expected);
    });

    it('should handle empty input', () => {
      expect(cleanData({})).toEqual({});
      expect(cleanData(null as any)).toEqual({});
      expect(cleanData(undefined as any)).toEqual({});
    });

    it('should preserve arrays', () => {
      const input = {
        validArray: [1, 2, 3],
        emptyArray: [],
        nullValue: null
      };
      
      const expected = {
        validArray: [1, 2, 3],
        emptyArray: []
      };
      
      expect(cleanData(input)).toEqual(expected);
    });

    it('should handle deeply nested structures', () => {
      const input = {
        level1: {
          level2: {
            valid: 'keep',
            empty: '',
            level3: {
              null: null,
              keep: 'this'
            }
          },
          empty: ''
        }
      };
      
      const expected = {
        level1: {
          level2: {
            valid: 'keep',
            level3: {
              keep: 'this'
            }
          }
        }
      };
      
      expect(cleanData(input)).toEqual(expected);
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain data integrity in dot ↔ nested conversion', () => {
      const original = {
        employeur: {
          siret: '12345678901234',
          nom: 'ACME Corporation'
        },
        victime: {
          nom: 'MARTIN',
          prenom: 'Jean'
        }
      };
      
      const dotNotation = nestedToDotObject(original);
      const backToNested = dotObjectToNested(dotNotation);
      
      expect(backToNested).toEqual(original);
    });

    it('should handle complex data types in round-trip', () => {
      const original = {
        section: {
          string: 'test',
          number: 42,
          boolean: true,
          array: [1, 2, 3],
          null: null
        }
      };
      
      const dotNotation = nestedToDotObject(original);
      const backToNested = dotObjectToNested(dotNotation);
      
      expect(backToNested).toEqual(original);
    });
  });
});