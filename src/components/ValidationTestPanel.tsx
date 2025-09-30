import React, { useState } from 'react';

export default function ValidationTestPanel() {
  const [testPayload] = useState({
    ok: true,
    requestId: 'test_' + Date.now(),
    next: '/validation',
    payload: {
      success: true,
      sessionId: 'test_session',
      documentType: 'AT_NORMALE',
      extractedData: {
        employeur: {
          nom_raison_sociale: 'TEST COMPANY',
          siret: '12345678901234',
          adresse: '123 Test Street'
        },
        victime: {
          nom: 'DOE',
          prenom: 'John',
          numero_secu: '123456789012345'
        }
      },
      validationFields: {},
      contextualQuestions: []
    }
  });

  const injectTestData = () => {
    const payloadKey = 'ocr_payload';
    sessionStorage.setItem(payloadKey, JSON.stringify(testPayload));
    sessionStorage.setItem('current_request_id', testPayload.requestId);
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={injectTestData}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium"
      >
        Injecter données de test
      </button>
    </div>
  );
}