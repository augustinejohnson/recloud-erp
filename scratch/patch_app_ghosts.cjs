const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

const searchStr = `  const processUserWorkspaces = async (user) => {
    const workspaces = await getUserWorkspaces(user.uid);
    if (workspaces.length === 0) {
      setPublicView('register');
      setRegEmail(user.email || '');
      setAuthMessage({ type: 'error', text: 'You need to register a workspace first to continue.' });
    } else if (workspaces.length === 1) {
      await loadWorkspace(workspaces[0].id, user.uid);
    } else {
      // Multiple workspaces, show selection UI
      setAvailableWorkspaces(workspaces);
      setTempAuthUser(user);
      setShowWorkspaceSelect(true);
    }
  };`;

const replaceStr = `  const processUserWorkspaces = async (user) => {
    const rawWorkspaces = await getUserWorkspaces(user.uid);
    
    // Auto-verify workspaces to prevent ghosts from showing up
    const verifiedWorkspaces = [];
    for (const ws of rawWorkspaces) {
      try {
        const empRef = doc(db, \`organizations/\${ws.id}/employees\`, user.uid);
        const empSnap = await getDoc(empRef);
        if (empSnap.exists()) {
          verifiedWorkspaces.push(ws);
        } else {
          await removeUserWorkspace(user.uid, ws.id);
        }
      } catch (err) {
        console.error('Error verifying workspace:', err);
      }
    }

    if (verifiedWorkspaces.length === 0) {
      setPublicView('register');
      setRegEmail(user.email || '');
      setAuthMessage({ type: 'error', text: 'You need to register a workspace first to continue.' });
    } else if (verifiedWorkspaces.length === 1) {
      await loadWorkspace(verifiedWorkspaces[0].id, user.uid);
    } else {
      // Multiple valid workspaces, show selection UI
      setAvailableWorkspaces(verifiedWorkspaces);
      setTempAuthUser(user);
      setShowWorkspaceSelect(true);
    }
  };`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync('src/App.jsx', content);
  console.log('App.jsx patched to verify ghost workspaces!');
} else {
  console.log('Failed to find processUserWorkspaces in App.jsx');
}
