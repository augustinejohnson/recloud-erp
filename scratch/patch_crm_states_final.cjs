const fs = require('fs');
let crmContent = fs.readFileSync('src/CrmModule.jsx', 'utf8');

const missingStates = `  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const startCallSimulation = () => {
    setCallDuration(0);
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    window.currentCallInterval = interval;
  };

  const handleSimulateCallEnd = () => {
    clearInterval(window.currentCallInterval);
    setIsPhoneModalOpen(false);
    const note = {
      type: 'Call',
      text: \`Call ended after \${Math.floor(callDuration / 60)}m \${callDuration % 60}s\`,
      date: new Date().toISOString(),
      author: currentUser?.name || 'Admin'
    };
    const updatedNotes = [...(selectedCustomer?.notes || []), note];
    setSelectedCustomer({ ...selectedCustomer, notes: updatedNotes });
    if(selectedCustomer?.id) updateCustomer(selectedCustomer.id, { notes: updatedNotes }, currentTenant);
  };

  const handleSendEmail = async () => {
    if (!emailSubject || !emailBody) {
      alert("Subject and Body are required.");
      return;
    }
    const note = {
      type: 'Email',
      text: \`Subject: \${emailSubject}\\n\\n\${emailBody}\`,
      date: new Date().toISOString(),
      author: currentUser?.name || 'Admin'
    };
    const updatedNotes = [...(selectedCustomer?.notes || []), note];
    setSelectedCustomer({ ...selectedCustomer, notes: updatedNotes });
    if(selectedCustomer?.id) await updateCustomer(selectedCustomer.id, { notes: updatedNotes }, currentTenant);
    setIsEmailModalOpen(false);
  };

  const handleDraftWithAI = () => {
    setEmailBody(\`Dear \${selectedCustomer?.name || 'Customer'},\\n\\nI hope this email finds you well. I am following up regarding our previous conversation. Please let me know if you need any further assistance.\\n\\nBest regards,\\n\${currentUser?.name || 'Admin'}\`);
  };

  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);
`;

const statePattern = `  const [searchQuery, setSearchQuery] = useState('');`;

if (crmContent.includes(statePattern)) {
  crmContent = crmContent.replace(statePattern, missingStates + '\n' + statePattern);
} else {
  console.log("Could not find statePattern!");
}

const oldTr = `<tr key={cust.id} className="hover:bg-slate-50/50 transition-colors">`;
const newTr = `<tr key={cust.id} onClick={() => { setSelectedCustomer(cust); setIsCustomerDetailsOpen(true); }} className="hover:bg-slate-50/50 transition-colors cursor-pointer">`;
if (crmContent.includes(oldTr)) {
  crmContent = crmContent.replace(oldTr, newTr);
} else {
    // try replacing with space
    const oldTr2 = `<tr key={cust.id} className="hover:bg-slate-50/50 transition-colors" >`;
    if(crmContent.includes(oldTr2)) {
        crmContent = crmContent.replace(oldTr2, newTr);
    }
}


fs.writeFileSync('src/CrmModule.jsx', crmContent);
console.log('CRM States INJECTED SUCCESSFULLY!');
