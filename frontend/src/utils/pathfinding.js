// Dijkstra's Algorithm implementation
export function dijkstra(graph, start, end) {
  // Priority queue implementation
  const pq = new PriorityQueue();
  const distances = {};
  const previous = {};
  const visited = new Set();
  const path = [];

  // Initialize distances
  for (const node in graph.nodes) {
    distances[node] = Infinity;
    previous[node] = null;
  }

  distances[start] = 0;
  pq.enqueue(start, 0);

  while (!pq.isEmpty()) {
    const current = pq.dequeue().element;

    if (current === end) {
      // Reconstruct path
      let curr = end;
      while (curr !== null) {
        path.unshift(graph.nodes[curr]);
        curr = previous[curr];
      }
      return path;
    }

    if (visited.has(current)) continue;
    visited.add(current);

    for (const neighbor of graph.edges[current] || []) {
      if (visited.has(neighbor.node)) continue;

      const distance = distances[current] + neighbor.weight;

      if (distance < distances[neighbor.node]) {
        distances[neighbor.node] = distance;
        previous[neighbor.node] = current;
        pq.enqueue(neighbor.node, distance);
      }
    }
  }

  return null; // No path found
}

// A* Algorithm implementation
export function aStar(graph, start, end) {
  const pq = new PriorityQueue();
  const gScore = {};
  const fScore = {};
  const previous = {};
  const visited = new Set();
  const path = [];

  // Initialize scores
  for (const node in graph.nodes) {
    gScore[node] = Infinity;
    fScore[node] = Infinity;
    previous[node] = null;
  }

  gScore[start] = 0;
  fScore[start] = heuristic(graph.nodes[start], graph.nodes[end]);
  pq.enqueue(start, fScore[start]);

  while (!pq.isEmpty()) {
    const current = pq.dequeue().element;

    if (current === end) {
      // Reconstruct path
      let curr = end;
      while (curr !== null) {
        path.unshift(graph.nodes[curr]);
        curr = previous[curr];
      }
      return path;
    }

    if (visited.has(current)) continue;
    visited.add(current);

    for (const neighbor of graph.edges[current] || []) {
      if (visited.has(neighbor.node)) continue;

      const tentativeGScore = gScore[current] + neighbor.weight;

      if (tentativeGScore < gScore[neighbor.node]) {
        previous[neighbor.node] = current;
        gScore[neighbor.node] = tentativeGScore;
        fScore[neighbor.node] =
          gScore[neighbor.node] +
          heuristic(graph.nodes[neighbor.node], graph.nodes[end]);
        pq.enqueue(neighbor.node, fScore[neighbor.node]);
      }
    }
  }

  return null; // No path found
}

// Heuristic function for A* (Euclidean distance)
function heuristic(a, b) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}

// Simple priority queue implementation
class PriorityQueue {
  constructor() {
    this.elements = [];
  }

  enqueue(element, priority) {
    this.elements.push({ element, priority });
    this.elements.sort((a, b) => a.priority - b.priority);
  }

  dequeue() {
    return this.elements.shift();
  }

  isEmpty() {
    return this.elements.length === 0;
  }
}
