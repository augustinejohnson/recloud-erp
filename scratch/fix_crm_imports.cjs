const fs = require('fs');
let content = fs.readFileSync('src/CrmModule.jsx', 'utf8');

const missingImports = `import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Building2, Users, User, Receipt, Search, Plus, Mail, Phone, Calendar, Target, CreditCard, Download, Trash2, Edit, X, Activity, BarChart3, TrendingUp, Briefcase, ArrowRight, ArrowLeft, Eye, FileText, AlertTriangle, Clock, MessageCircle, ExternalLink, ShieldCheck, ShieldOff, UserPlus, CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell
} from 'recharts';
import { addCustomer, updateCustomer, deleteCustomer, addDeal, updateDealStatus, updateDeal, addInvoice, updateInvoiceStatus, updateInvoice, deleteInvoice, addEmployee, updateEmployee, deleteEmployee, createAuthUser, getProjects } from './firebase';

export default function CrmModule`;

content = content.replace('export default function CrmModule', missingImports);
fs.writeFileSync('src/CrmModule.jsx', content);
console.log('Restored imports in CrmModule.jsx');
