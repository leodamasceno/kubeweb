const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');

const execPromise = promisify(exec);
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to run kubectl commands
async function runKubectl(args, namespace = null) {
  try {
    let cmd = `kubectl ${args}`;
    if (namespace && !args.includes('--namespace')) {
      cmd += ` --namespace ${namespace}`;
    }
    cmd += ' --output json';
    
    const { stdout } = await execPromise(cmd);
    return JSON.parse(stdout);
  } catch (error) {
    console.error('kubectl error:', error.message);
    throw new Error(`kubectl command failed: ${error.message}`);
  }
}

// Get all namespaces
app.get('/api/namespaces', async (req, res) => {
  try {
    const result = await runKubectl('get namespaces');
    const namespaces = result.items.map(ns => ns.metadata.name);
    res.json(namespaces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pods
app.get('/api/pods', async (req, res) => {
  try {
    const namespace = req.query.namespace || 'default';
    const result = await runKubectl('get pods', namespace);
    const pods = result.items.map(pod => ({
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      status: pod.status.phase,
      restarts: pod.status.containerStatuses?.[0]?.restartCount || 0,
      age: pod.metadata.creationTimestamp,
      containers: pod.spec.containers.map(c => c.name),
      image: pod.spec.containers[0]?.image || ''
    }));
    res.json(pods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get deployments
app.get('/api/deployments', async (req, res) => {
  try {
    const namespace = req.query.namespace || 'default';
    const result = await runKubectl('get deployments', namespace);
    const deployments = result.items.map(dep => ({
      name: dep.metadata.name,
      namespace: dep.metadata.namespace,
      replicas: dep.status.replicas || 0,
      readyReplicas: dep.status.readyReplicas || 0,
      updatedReplicas: dep.status.updatedReplicas || 0,
      age: dep.metadata.creationTimestamp,
      image: dep.spec.template.spec.containers[0]?.image || ''
    }));
    res.json(deployments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get services
app.get('/api/services', async (req, res) => {
  try {
    const namespace = req.query.namespace || 'default';
    const result = await runKubectl('get services', namespace);
    const services = result.items.map(svc => ({
      name: svc.metadata.name,
      namespace: svc.metadata.namespace,
      type: svc.spec.type,
      clusterIP: svc.spec.clusterIP,
      externalIP: svc.status.loadBalancer?.ingress?.[0]?.ip || 'N/A',
      ports: svc.spec.ports.map(p => `${p.port}/${p.protocol}`).join(', '),
      age: svc.metadata.creationTimestamp
    }));
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ingresses
app.get('/api/ingresses', async (req, res) => {
  try {
    const namespace = req.query.namespace || 'default';
    const result = await runKubectl('get ingress', namespace);
    const ingresses = result.items.map(ing => ({
      name: ing.metadata.name,
      namespace: ing.metadata.namespace,
      class: ing.spec.ingressClassName || 'N/A',
      hosts: ing.spec.rules?.map(r => r.host).join(', ') || 'N/A',
      ips: ing.status.loadBalancer?.ingress?.map(i => i.ip || i.hostname).join(', ') || 'Pending',
      age: ing.metadata.creationTimestamp
    }));
    res.json(ingresses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get RBAC - ClusterRoles
app.get('/api/clusterroles', async (req, res) => {
  try {
    const result = await runKubectl('get clusterroles');
    const roles = result.items.map(role => ({
      name: role.metadata.name,
      rules: role.rules?.length || 0,
      age: role.metadata.creationTimestamp
    }));
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get RBAC - Roles
app.get('/api/roles', async (req, res) => {
  try {
    const namespace = req.query.namespace || 'default';
    const result = await runKubectl('get roles', namespace);
    const roles = result.items.map(role => ({
      name: role.metadata.name,
      namespace: role.metadata.namespace,
      rules: role.rules?.length || 0,
      age: role.metadata.creationTimestamp
    }));
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get StatefulSets
app.get('/api/statefulsets', async (req, res) => {
  try {
    const namespace = req.query.namespace || 'default';
    const result = await runKubectl('get statefulsets', namespace);
    const statefulsets = result.items.map(sts => ({
      name: sts.metadata.name,
      namespace: sts.metadata.namespace,
      replicas: sts.status.replicas || 0,
      readyReplicas: sts.status.readyReplicas || 0,
      age: sts.metadata.creationTimestamp
    }));
    res.json(statefulsets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get DaemonSets
app.get('/api/daemonsets', async (req, res) => {
  try {
    const namespace = req.query.namespace || 'default';
    const result = await runKubectl('get daemonsets', namespace);
    const daemonsets = result.items.map(ds => ({
      name: ds.metadata.name,
      namespace: ds.metadata.namespace,
      desiredNumberScheduled: ds.status.desiredNumberScheduled || 0,
      numberReady: ds.status.numberReady || 0,
      age: ds.metadata.creationTimestamp
    }));
    res.json(daemonsets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ConfigMaps
app.get('/api/configmaps', async (req, res) => {
  try {
    const namespace = req.query.namespace || 'default';
    const result = await runKubectl('get configmaps', namespace);
    const configmaps = result.items.map(cm => ({
      name: cm.metadata.name,
      namespace: cm.metadata.namespace,
      keys: Object.keys(cm.data || {}).length,
      age: cm.metadata.creationTimestamp
    }));
    res.json(configmaps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Secrets
app.get('/api/secrets', async (req, res) => {
  try {
    const namespace = req.query.namespace || 'default';
    const result = await runKubectl('get secrets', namespace);
    const secrets = result.items.map(sec => ({
      name: sec.metadata.name,
      namespace: sec.metadata.namespace,
      type: sec.type,
      keys: Object.keys(sec.data || {}).length,
      age: sec.metadata.creationTimestamp
    }));
    res.json(secrets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pod logs
app.get('/api/pods/:namespace/:name/logs', async (req, res) => {
  try {
    const { namespace, name } = req.params;
    const { stdout } = await execPromise(`kubectl logs ${name} --namespace ${namespace}`);
    res.json({ logs: stdout });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pod details
app.get('/api/pods/:namespace/:name', async (req, res) => {
  try {
    const { namespace, name } = req.params;
    const result = await runKubectl(`get pod ${name}`, namespace);
    res.json(result.items[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete resource
app.delete('/api/:resource/:namespace/:name', async (req, res) => {
  try {
    const { resource, namespace, name } = req.params;
    await execPromise(`kubectl delete ${resource} ${name} --namespace ${namespace}`);
    res.json({ success: true, message: `${resource} ${name} deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Describe resource
app.get('/api/describe/:resource/:namespace/:name', async (req, res) => {
  try {
    const { resource, namespace, name } = req.params;
    const { stdout } = await execPromise(`kubectl describe ${resource} ${name} --namespace ${namespace}`);
    res.json({ description: stdout });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get nodes
app.get('/api/nodes', async (req, res) => {
  try {
    const result = await runKubectl('get nodes');
    const nodes = result.items.map(node => ({
      name: node.metadata.name,
      status: node.status.conditions?.find(c => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
      age: node.metadata.creationTimestamp,
      kubeletVersion: node.status.nodeInfo?.kubeletVersion || 'Unknown'
    }));
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cluster events
app.get('/api/events', async (req, res) => {
  try {
    const namespace = req.query.namespace || 'default';
    const showAll = req.query.all === 'true'; // Allow showing all events including Normal
    const result = await runKubectl('get events', namespace);
    let events = (result.items || [])
      .map(event => ({
        name: event.metadata.name,
        namespace: event.metadata.namespace,
        type: event.type || 'Normal',
        reason: event.reason,
        message: event.message,
        involvedObject: `${event.involvedObject?.kind}/${event.involvedObject?.name}`,
        count: event.count,
        firstTimestamp: event.firstTimestamp,
        lastTimestamp: event.lastTimestamp,
        source: event.source?.component || 'Unknown'
      }));
    
    // Only filter out Normal events if not explicitly requested
    if (!showAll) {
      events = events.filter(event => event.type !== 'Normal');
    }
    
    events = events.reverse(); // Most recent first
    res.json({ events: events, total: result.items?.length || 0 });
  } catch (error) {
    console.error('Events API error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`\n✨ KubeWeb is running at http://localhost:${PORT}`);
  console.log(`📦 Open your browser and navigate to the URL above`);
  console.log(`🔗 Using KUBECONFIG: ${process.env.KUBECONFIG || '~/.kube/config'}\n`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is in use, trying ${PORT + 1}...`);
    const server = app.listen(PORT + 1, () => {
      console.log(`\n✨ KubeWeb is running at http://localhost:${PORT + 1}`);
      console.log(`📦 Open your browser and navigate to the URL above`);
      console.log(`🔗 Using KUBECONFIG: ${process.env.KUBECONFIG || '~/.kube/config'}\n`);
    });
  } else {
    throw err;
  }
});
