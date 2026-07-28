const fs = require('fs');
let content = fs.readFileSync('src/firebase.js', 'utf8');

if (!content.includes('removeUserWorkspace')) {
  const removeWorkspaceCode = `
export const removeUserWorkspace = async (uid, tenantId) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    let workspaces = userSnap.data().workspaces || [];
    workspaces = workspaces.filter(w => w.id !== tenantId);
    await setDoc(userRef, { workspaces }, { merge: true });
  }
};
`;

  content = content.replace('export const getUserWorkspaces = async (uid) => {', removeWorkspaceCode + '\nexport const getUserWorkspaces = async (uid) => {');
  
  // Update deleteEmployee
  const deleteEmployeeOld = `export const deleteEmployee = async (employeeId, tenantId = "tenant_1") => {
  const employeeRef = doc(db, \`organizations/\${tenantId}/employees\`, employeeId);
  await deleteDoc(employeeRef);
};`;
  const deleteEmployeeNew = `export const deleteEmployee = async (employeeId, tenantId = "tenant_1") => {
  const employeeRef = doc(db, \`organizations/\${tenantId}/employees\`, employeeId);
  await deleteDoc(employeeRef);
  await removeUserWorkspace(employeeId, tenantId);
};`;

  content = content.replace(deleteEmployeeOld, deleteEmployeeNew);
  fs.writeFileSync('src/firebase.js', content);
  console.log('firebase.js patched!');
} else {
  console.log('Already patched.');
}
