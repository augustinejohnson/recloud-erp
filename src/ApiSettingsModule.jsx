import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, CheckCircle2, ShieldAlert, Globe, Code2, BookOpen, Zap, Lock, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { db, deleteApiKey } from './firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const API_BASE = 'https://us-central1-recloud-erp.cloudfunctions.net/api';

const ENDPOINTS = [
  { method: 'GET',  path: '/v1/health',       desc: 'Verify your key is valid and get tenant info', scope: 'read' },
  { method: 'GET',  path: '/v1/customers',     desc: 'List all customers / clients', scope: 'read' },
  { method: 'POST', path: '/v1/customers',     desc: 'Create a new customer', scope: 'read_write', body: '{ "name": "Acme Ltd", "email": "info@acme.com" }' },
  { method: 'GET',  path: '/v1/invoices',      desc: 'List all invoices', scope: 'read' },
  { method: 'POST', path: '/v1/invoices',      desc: 'Create a new invoice', scope: 'read_write', body: '{ "customerName": "Acme Ltd", "totalAmount": 50000, "status": "unpaid" }' },
  { method: 'GET',  path: '/v1/projects',      desc: 'List all projects / cases', scope: 'read' },
  { method: 'POST', path: '/v1/projects',      desc: 'Create a new project / case', scope: 'read_write', body: '{ "name": "Case: Smith v. Jones", "status": "Active" }' },
  { method: 'GET',  path: '/v1/employees',     desc: 'List all staff members', scope: 'read' },
  { method: 'GET',  path: '/v1/expenses',      desc: 'List all expenses', scope: 'read' },
  { method: 'POST', path: '/v1/expenses',      desc: 'Log a new expense', scope: 'read_write', body: '{ "description": "Court Filing Fee", "amount": 15000, "category": "Legal" }' },
  { method: 'GET',  path: '/v1/inventory',     desc: 'List all products / inventory', scope: 'read' },
  { method: 'GET',  path: '/v1/sales',         desc: 'List all POS sales', scope: 'read' },
  { method: 'GET',  path: '/v1/b2b-orders',    desc: 'List all B2B / wholesale orders', scope: 'read' },
  { method: 'GET',  path: '/v1/contracts',     desc: 'List all recurring contracts', scope: 'read' },
  { method: 'POST', path: '/v1/contracts',     desc: 'Create a recurring billing contract', scope: 'read_write', body: '{ "customerName": "Acme Ltd", "serviceName": "Monthly Retainer", "amount": 200000, "status": "Active" }' },
  { method: 'GET',  path: '/v1/deals',         desc: 'List all CRM deals', scope: 'read' },
  { method: 'GET',  path: '/v1/documents',     desc: 'List all document metadata', scope: 'read' },
];

const METHOD_COLORS = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-emerald-100 text-emerald-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
};

export default function ApiSettingsModule({ currentTenant }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScope, setNewKeyScope] = useState('read');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [activeTab, setActiveTab] = useState('keys'); // 'keys' | 'docs' | 'examples'
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedLang, setSelectedLang] = useState('curl');
  const [expandedEndpoint, setExpandedEndpoint] = useState(null);
  const [testingHealth, setTestingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState(null);

  useEffect(() => {
    if (currentTenant) fetchApiKeys();
  }, [currentTenant]);

  const fetchApiKeys = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'api_keys'), where('tenantId', '==', currentTenant));
      const snapshot = await getDocs(q);
      const keys = [];
      snapshot.forEach(d => keys.push({ id: d.id, ...d.data() }));
      setApiKeys(keys.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const db2 = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return db2 - da;
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setIsGenerating(true);
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let keyString = 'sk_live_';
      for (let i = 0; i < 32; i++) keyString += chars[Math.floor(Math.random() * chars.length)];
      const newKeyData = { name: newKeyName, key: keyString, tenantId: currentTenant, status: 'active', scope: newKeyScope, createdAt: serverTimestamp() };
      const docRef = await addDoc(collection(db, 'api_keys'), newKeyData);
      setApiKeys([{ id: docRef.id, ...newKeyData }, ...apiKeys]);
      setNewKeyName('');
      setNewKeyScope('read');
    } catch (err) {
      alert('Failed to generate key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!confirm('Revoke this key? External apps using it will lose access immediately.')) return;
    try {
      await updateDoc(doc(db, 'api_keys', keyId), { status: 'revoked' });
      setApiKeys(apiKeys.map(k => k.id === keyId ? { ...k, status: 'revoked' } : k));
    } catch { alert('Failed to revoke key.'); }
  };

  const handleDeleteKey = async (keyId) => {
    if (!confirm('Permanently delete this key? This cannot be undone.')) return;
    try {
      await deleteApiKey(keyId);
      setApiKeys(apiKeys.filter(k => k.id !== keyId));
      if (selectedKey?.id === keyId) setSelectedKey(null);
    } catch { alert('Failed to delete key.'); }
  };

  const copy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const testHealth = async () => {
    if (!selectedKey) return alert('Select an active key first.');
    setTestingHealth(true);
    setHealthResult(null);
    try {
      const res = await fetch(`${API_BASE}/v1/health`, { headers: { 'x-api-key': selectedKey.key } });
      const data = await res.json();
      setHealthResult({ ok: res.ok, data, status: res.status });
    } catch (err) {
      setHealthResult({ ok: false, data: { error: 'Network error — API may still be starting up.' }, status: 0 });
    } finally {
      setTestingHealth(false);
    }
  };

  const activeKey = selectedKey || apiKeys.find(k => k.status === 'active');
  const keyPlaceholder = activeKey?.key || 'sk_live_YOUR_API_KEY_HERE';

  const codeExamples = {
    curl: `# Test your connection
curl "${API_BASE}/v1/health" \\
  -H "x-api-key: ${keyPlaceholder}"

# List all customers
curl "${API_BASE}/v1/customers" \\
  -H "x-api-key: ${keyPlaceholder}"

# Create a new invoice (read-write key required)
curl -X POST "${API_BASE}/v1/invoices" \\
  -H "x-api-key: ${keyPlaceholder}" \\
  -H "Content-Type: application/json" \\
  -d '{"customerName":"Acme Ltd","totalAmount":50000,"status":"unpaid"}'`,

    javascript: `const API_BASE = '${API_BASE}';
const API_KEY = '${keyPlaceholder}';

const headers = {
  'x-api-key': API_KEY,
  'Content-Type': 'application/json'
};

// Test connection
const health = await fetch(\`\${API_BASE}/v1/health\`, { headers });
const { tenant } = await health.json();
console.log('Connected to:', tenant.companyName);

// Fetch all customers
const res = await fetch(\`\${API_BASE}/v1/customers\`, { headers });
const { data: customers } = await res.json();
console.log(customers);

// Create a new invoice (read-write key required)
const newInvoice = await fetch(\`\${API_BASE}/v1/invoices\`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    customerName: 'Acme Ltd',
    totalAmount: 50000,
    status: 'unpaid'
  })
});
const result = await newInvoice.json();
console.log('Created invoice ID:', result.id);`,

    python: `import requests

API_BASE = '${API_BASE}'
API_KEY = '${keyPlaceholder}'
HEADERS = {'x-api-key': API_KEY, 'Content-Type': 'application/json'}

# Test connection
health = requests.get(f'{API_BASE}/v1/health', headers=HEADERS)
print('Connected to:', health.json()['tenant']['companyName'])

# Fetch all customers
customers = requests.get(f'{API_BASE}/v1/customers', headers=HEADERS)
print(customers.json())

# Create a new invoice (read-write key required)
invoice = requests.post(f'{API_BASE}/v1/invoices', headers=HEADERS, json={
    'customerName': 'Acme Ltd',
    'totalAmount': 50000,
    'status': 'unpaid'
})
print('Created invoice ID:', invoice.json()['id'])`
  };

  const tabs = [
    { id: 'keys', label: 'API Keys', icon: Key },
    { id: 'docs', label: 'Endpoint Reference', icon: BookOpen },
    { id: 'examples', label: 'Code Examples', icon: Code2 },
  ];

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800">Developer API</h1>
        <p className="text-sm text-slate-500 mt-1">Connect your ERP to any external software using secure API keys.</p>
      </div>

      {/* API Base URL Banner */}
      <div className="bg-slate-900 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center gap-3 shadow-lg">
        <div className="flex items-center gap-2 shrink-0">
          <Globe className="w-5 h-5 text-recloud-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">API Base URL</span>
        </div>
        <code className="text-recloud-300 font-mono text-sm flex-1 break-all">{API_BASE}</code>
        <button onClick={() => copy('baseurl', API_BASE)} className="shrink-0 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors">
          {copiedId === 'baseurl' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          Copy
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ─── TAB: Keys ──────────────────────────────────────────────── */}
      {activeTab === 'keys' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto min-h-0">
          {/* Generate */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><Key className="w-4 h-4 text-recloud-600" /> Generate New Key</h3>
              <form onSubmit={handleGenerateKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Key Name</label>
                  <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} required placeholder="e.g. QuickBooks Sync" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-recloud-500 focus:ring-2 focus:ring-recloud-200 transition-all text-sm font-medium text-slate-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Permission Scope</label>
                  <select value={newKeyScope} onChange={e => setNewKeyScope(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-recloud-500 text-sm font-medium text-slate-800">
                    <option value="read">Read Only — can only fetch data</option>
                    <option value="read_write">Read & Write — can create records</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1.5">
                    {newKeyScope === 'read' ? '✓ Safe for partners & reporting tools' : '⚠ Only share with trusted integrations'}
                  </p>
                </div>
                <button type="submit" disabled={isGenerating || !newKeyName.trim()} className="w-full bg-recloud-600 hover:bg-recloud-700 disabled:bg-slate-300 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all">
                  {isGenerating ? 'Generating...' : <><Plus className="w-4 h-4" /> Create API Key</>}
                </button>
              </form>
            </div>

            {/* Test Key */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Test a Key</h3>
              <p className="text-xs text-slate-500 mb-3">Select an active key from the list, then click to ping the API.</p>
              <select value={selectedKey?.id || ''} onChange={e => setSelectedKey(apiKeys.find(k => k.id === e.target.value) || null)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none mb-3">
                <option value="">— Select a key —</option>
                {apiKeys.filter(k => k.status === 'active').map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
              <button onClick={testHealth} disabled={testingHealth || !selectedKey} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all">
                {testingHealth ? <><RefreshCw className="w-4 h-4 animate-spin" /> Testing...</> : 'Ping API'}
              </button>
              {healthResult && (
                <div className={`mt-3 p-3 rounded-xl text-xs font-mono ${healthResult.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                  <p className="font-bold mb-1">{healthResult.ok ? '✓ Connected' : '✗ Failed'} · HTTP {healthResult.status}</p>
                  <pre className="whitespace-pre-wrap break-all">{JSON.stringify(healthResult.data, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Security Note */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong>Security:</strong> Never share API keys publicly or commit them to source code. Each key only has access to your company's data. Other tenants are completely isolated.
              </div>
            </div>
          </div>

          {/* Key List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">Your API Keys</h3>
                <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-lg">{apiKeys.length} Total</span>
              </div>
              {apiKeys.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-12 text-center text-slate-400 text-sm">No keys yet. Generate one to start integrating.</div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-y-auto">
                  {apiKeys.map(k => (
                    <div key={k.id} className="p-5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-bold text-slate-800">{k.name}</h4>
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${k.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{k.status}</span>
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${k.scope === 'read_write' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              <Lock className="w-2.5 h-2.5" /> {k.scope === 'read_write' ? 'Read & Write' : 'Read Only'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            Created: {(() => { try { const d = k.createdAt?.toDate ? k.createdAt.toDate() : new Date(); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return 'Just now'; } })()}
                            {k.usageCount ? ` · ${k.usageCount} API call${k.usageCount !== 1 ? 's' : ''}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {k.status === 'active' ? (
                            <button onClick={() => handleRevokeKey(k.id)} className="p-2 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Revoke (disable)">
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => handleDeleteKey(k.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete permanently">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {k.status === 'active' && (
                        <div className="mt-3 bg-slate-900 rounded-xl p-3 flex items-center gap-2">
                          <code className="text-recloud-300 font-mono text-xs flex-1 truncate">{k.key}</code>
                          <button onClick={() => copy(k.id, k.key)} className="shrink-0 p-1.5 text-slate-400 hover:text-white rounded-md transition-colors">
                            {copiedId === k.id ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: Docs ──────────────────────────────────────────────── */}
      {activeTab === 'docs' && (
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <strong>Authentication:</strong> All requests must include the header <code className="bg-blue-100 px-1 rounded font-mono text-xs">x-api-key: sk_live_...</code>. POST requests also require <code className="bg-blue-100 px-1 rounded font-mono text-xs">Content-Type: application/json</code>.
          </div>
          {ENDPOINTS.map((ep, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <button onClick={() => setExpandedEndpoint(expandedEndpoint === i ? null : i)} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left">
                <span className={`text-xs font-black px-2.5 py-1 rounded-lg shrink-0 w-14 text-center ${METHOD_COLORS[ep.method]}`}>{ep.method}</span>
                <code className="font-mono text-sm text-slate-800 font-bold flex-1">{ep.path}</code>
                <span className="text-sm text-slate-500 flex-1 hidden md:block">{ep.desc}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${ep.scope === 'read_write' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                  {ep.scope === 'read_write' ? 'Read-Write Key' : 'Any Key'}
                </span>
                {expandedEndpoint === i ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>
              {expandedEndpoint === i && (
                <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
                  <p className="text-sm text-slate-600">{ep.desc}</p>
                  {ep.body && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Request Body (JSON)</p>
                      <pre className="bg-slate-900 text-green-300 p-3 rounded-xl text-xs font-mono overflow-x-auto">{ep.body}</pre>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Example Request</p>
                    <pre className="bg-slate-900 text-recloud-300 p-3 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`curl "${API_BASE}${ep.path}" \\
  -H "x-api-key: ${keyPlaceholder}"${ep.body ? ` \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -d '${ep.body}'` : ''}`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB: Code Examples ─────────────────────────────────────── */}
      {activeTab === 'examples' && (
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
          {/* Key picker */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row items-start md:items-center gap-3">
            <span className="text-sm font-bold text-slate-600 shrink-0">Using key:</span>
            <select value={selectedKey?.id || ''} onChange={e => setSelectedKey(apiKeys.find(k => k.id === e.target.value) || null)} className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none">
              <option value="">— showing placeholder key —</option>
              {apiKeys.filter(k => k.status === 'active').map(k => <option key={k.id} value={k.id}>{k.name} ({k.scope})</option>)}
            </select>
            <p className="text-xs text-slate-400">Select an active key to auto-fill examples</p>
          </div>

          {/* Language tabs */}
          <div className="flex gap-2">
            {['curl', 'javascript', 'python'].map(lang => (
              <button key={lang} onClick={() => setSelectedLang(lang)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedLang === lang ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {lang === 'javascript' ? 'JavaScript' : lang.charAt(0).toUpperCase() + lang.slice(1)}
              </button>
            ))}
          </div>

          {/* Code block */}
          <div className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{selectedLang === 'javascript' ? 'JavaScript (fetch)' : selectedLang}</span>
              <button onClick={() => copy('code', codeExamples[selectedLang])} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-slate-700">
                {copiedId === 'code' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId === 'code' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-6 text-sm font-mono text-slate-100 overflow-x-auto whitespace-pre leading-relaxed">{codeExamples[selectedLang]}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
