document.addEventListener('DOMContentLoaded', () => {
  const renderTemplateById = id => {
    const rootNode = getNodeById('root');
    const template = getNodeById(id);
    const node = template.content.cloneNode(true);

    rootNode.innerHTML = '';
    rootNode.appendChild(node);
  };
  const getNodeById = id => document.getElementById(id);
  const renderLandingView = () => {
    renderTemplateById('landing');
      
    const trainerParticipant = getNodeById('loginTrainer');
    trainerParticipant.addEventListener('click', renderTrainerLoginView);
    
    const loginParticipant = getNodeById('loginParticipant');
    loginParticipant.addEventListener('click', renderParticipantLoginView)

  };
  const renderParticipantLoginView = () => {
    renderTemplateById('participantLogin');
    
    const participantLoginForm = getNodeById('participantLoginForm');
      participantLoginForm.addEventListener('submit', e => {
        e.preventDefault();
        const formData = new FormData(event.target);
        const name = formData.get('name');
        const group = formData.get('group');
        sendEvent('PARTICIPANT_LOGIN', { name, group });
      });

  };
  const renderTrainerLoginView = () => {
    renderTemplateById('trainerLogin');
    const trainerLoginForm = getNodeById('trainerLoginForm');
    trainerLoginForm.addEventListener('submit', e => {
      
      e.preventDefault();
      const formData = new FormData(event.target);
      const name = formData.get('name');
      sendEvent('TRAINER_LOGIN', { name });
    });

  };
  const renderIssueSubmitView = () => {
    renderTemplateById('issueSubmit');
    const issueSubmitForm = getNodeById('issueSubmitForm');
    issueSubmitForm.addEventListener('submit', e => {
      e.preventDefault();
      const formData = new FormData(event.target);
      const problem = formData.get('problem');
      sendEvent('TRAINER_NEEDED', { problem });
    });
  };
  const renderIssueReceivedView = () => {
    renderTemplateById('issueReceived');
  };
  const renderIssueTakenView = trainerName => {
    renderTemplateById('issueTaken');
  };
  const renderHintReceivedView = hint => {
    renderTemplateById('hintReceived');
  };
  const renderTrainerDashboardView = data => {
    renderTemplateById('trainerDashboard');

    const issueListItemTemplate = getNodeById('issueListItem');
    const issueListNode = getNodeById('issueList');

    data.forEach(it => {
      const issueListItemNode = document.importNode(issueListItemTemplate.content, true);
      const takeIssueButtonNode = issueListItemNode.querySelector('.issueListItemActions button');

      issueListItemNode.querySelector('.issueListItemName').textContent = it.userName;
      issueListItemNode.querySelector('.issueListItemGroup').textContent = it.userGroup;
      issueListItemNode.querySelector('.issueListItemProblem').textContent = it.problem;
      issueListItemNode.querySelector('.issueListItemStatus').textContent = it.status;
      issueListNode.appendChild(issueListItemNode);

      switch(it.status) {
        case 'PENDING':
          takeIssueButtonNode.addEventListener('click', () => sendEvent('ISSUE_TAKEN', it.id));
          break;
          default:
          takeIssueButtonNode.classList.add('hide');
      }
    });
  };

  renderLandingView();
  const socket = new WebSocket('ws://localhost:5000');
  
  socket.onopen = e => {
    console.log('onopen', e);
  };

  socket.onclose = event => {
    console.log(['WebSocket.onclose'], event);
  };

  socket.onmessage = event => {
    const { action, payload } = JSON.parse(event.data);
    switch (action) {
      case 'PARTICIPANT_LOGGED': {
        renderIssueSubmitView();
        break;
      }
      case 'ISSUE_RECEIVED': {
        renderIssueReceivedView();
        break;
      }
      case 'ISSUES': {
        renderTrainerDashboardView(payload);
        break;
      }
    }
  };

  socket.onerror = event => {
    console.error(['WebSocket.onerror'], event);
  };

  const sendEvent = (action, payload) => {
    try {
      socket.send(JSON.stringify({ action, payload }));
    }
  
    catch (e) {
      console.error(e);
    }
  };
});
