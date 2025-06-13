'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LeaseGenerator({ tenantId, propertyId }) {
  const [terms, setTerms] = useState([
    'Tenant agrees to pay rent of $X on the 1st of each month',
    'Security deposit of $X is required',
    'No pets allowed without written permission',
    'Tenant responsible for utilities'
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/leases/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId, propertyId, terms }),
      });

      if (!response.ok) throw new Error('Failed to generate lease');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lease-agreement.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-lg font-semibold mb-2">Generate Lease Agreement</h3>
      <div className="space-y-2 mb-4">
        {terms.map((term, index) => (
          <div key={index} className="flex items-start">
            <input
              type="text"
              value={term}
              onChange={(e) => {
                const newTerms = [...terms];
                newTerms[index] = e.target.value;
                setTerms(newTerms);
              }}
              className="flex-1 border rounded px-2 py-1"
            />
            <button
              onClick={() => {
                const newTerms = [...terms];
                newTerms.splice(index, 1);
                setTerms(newTerms);
              }}
              className="ml-2 text-red-500"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          onClick={() => setTerms([...terms, 'New term'])}
          className="text-blue-500 text-sm"
        >
          + Add Term
        </button>
      </div>
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
      >
        {isGenerating ? 'Generating...' : 'Generate PDF Lease'}
      </button>
    </div>
  );
}