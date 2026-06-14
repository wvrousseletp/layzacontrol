// Custom SVG Charts Generator

/**
 * Renders a grouped vertical Bar Chart in the target container.
 * @param {string} containerId - The ID of the container element
 * @param {Array} datasets - Array of { label, data (numbers), color }
 * @param {Array} labels - X-axis labels (strings)
 */
export function renderBarChart(containerId, datasets, labels) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!datasets || datasets.length === 0 || !labels || labels.length === 0) {
    container.innerHTML = `<div class="empty-state">Sem dados financeiros para exibir no gráfico.</div>`;
    return;
  }

  // Dimensions
  const width = container.clientWidth || 500;
  const height = container.clientHeight || 280;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Find max value
  let maxVal = 0;
  datasets.forEach(dataset => {
    dataset.data.forEach(val => {
      if (val > maxVal) maxVal = val;
    });
  });
  // Pad max val slightly
  maxVal = maxVal === 0 ? 100 : Math.ceil(maxVal * 1.15);

  // Y-axis grid increments
  const gridLinesCount = 4;
  let gridLines = '';
  let yAxisLabels = '';
  for (let i = 0; i <= gridLinesCount; i++) {
    const ratio = i / gridLinesCount;
    const yVal = maxVal * ratio;
    const yPos = paddingTop + chartHeight * (1 - ratio);
    
    // Grid line
    gridLines += `<line class="chart-grid-line" x1="${paddingLeft}" y1="${yPos}" x2="${width - paddingRight}" y2="${yPos}" />`;
    
    // Label
    yAxisLabels += `<text class="chart-label-text" x="${paddingLeft - 10}" y="${yPos + 4}" text-anchor="end">R$ ${Math.round(yVal)}</text>`;
  }

  // X-axis columns calculation
  const groupCount = labels.length;
  const groupWidth = chartWidth / groupCount;
  const datasetCount = datasets.length;
  const spacing = 4; // space between bars in same group
  const barWidth = Math.max(4, (groupWidth * 0.6 - spacing * (datasetCount - 1)) / datasetCount);

  let bars = '';
  let xAxisLabels = '';

  for (let g = 0; g < groupCount; g++) {
    const groupCenterX = paddingLeft + (g * groupWidth) + (groupWidth / 2);
    const startX = groupCenterX - (datasetCount * barWidth + (datasetCount - 1) * spacing) / 2;

    // Render bars for each dataset in the group
    for (let d = 0; d < datasetCount; d++) {
      const val = datasets[d].data[g] || 0;
      const barHeight = (val / maxVal) * chartHeight;
      const x = startX + d * (barWidth + spacing);
      const y = paddingTop + chartHeight - barHeight;

      if (val > 0) {
        bars += `
          <rect class="chart-bar" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${datasets[d].color}" opacity="0.85">
            <title>${datasets[d].label}: R$ ${val.toFixed(2)}</title>
            <animate attributeName="height" from="0" to="${barHeight}" dur="0.8s" cubic-bezier(0.4, 0, 0.2, 1) />
            <animate attributeName="y" from="${paddingTop + chartHeight}" to="${y}" dur="0.8s" cubic-bezier(0.4, 0, 0.2, 1) />
          </rect>
        `;
      }
    }

    // X-axis label
    xAxisLabels += `
      <text class="chart-label-text" x="${groupCenterX}" y="${height - paddingBottom + 20}" text-anchor="middle">
        ${labels[g]}
      </text>
    `;
  }

  // Generate Legend
  let legendHtml = '';
  datasets.forEach(d => {
    legendHtml += `
      <div class="legend-item">
        <span class="legend-dot" style="background-color: ${d.color}"></span>
        <span>${d.label}</span>
      </div>
    `;
  });

  // Render full SVG
  container.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
      <!-- Grid & Axes -->
      ${gridLines}
      <line class="chart-axis" x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${height - paddingBottom}" />
      <line class="chart-axis" x1="${paddingLeft}" y1="${height - paddingBottom}" x2="${width - paddingRight}" y2="${height - paddingBottom}" />
      
      <!-- Labels -->
      ${yAxisLabels}
      ${xAxisLabels}
      
      <!-- Data Bars -->
      ${bars}
    </svg>
    <div class="chart-legend">
      ${legendHtml}
    </div>
  `;
}

/**
 * Renders a glowing Line Chart for historical trend.
 * @param {string} containerId - The ID of the container element
 * @param {Array} dataPoints - Array of numbers
 * @param {Array} labels - Array of strings matching the dataPoints
 * @param {string} strokeColor - The hex/rgb color of the line
 * @param {string} labelName - Label description of the line
 */
export function renderLineChart(containerId, dataPoints, labels, strokeColor, labelName = 'Gasto') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!dataPoints || dataPoints.length === 0) {
    container.innerHTML = `<div class="empty-state">Sem dados para exibir no gráfico de linha.</div>`;
    return;
  }

  // Dimensions
  const width = container.clientWidth || 500;
  const height = container.clientHeight || 280;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Find max value
  let maxVal = Math.max(...dataPoints);
  maxVal = maxVal === 0 ? 100 : Math.ceil(maxVal * 1.15);

  // Grid lines (horizontal)
  const gridLinesCount = 4;
  let gridLines = '';
  let yAxisLabels = '';
  for (let i = 0; i <= gridLinesCount; i++) {
    const ratio = i / gridLinesCount;
    const yVal = maxVal * ratio;
    const yPos = paddingTop + chartHeight * (1 - ratio);
    
    gridLines += `<line class="chart-grid-line" x1="${paddingLeft}" y1="${yPos}" x2="${width - paddingRight}" y2="${yPos}" />`;
    yAxisLabels += `<text class="chart-label-text" x="${paddingLeft - 10}" y="${yPos + 4}" text-anchor="end">R$ ${Math.round(yVal)}</text>`;
  }

  // Plot path coordinates
  const pointsCount = dataPoints.length;
  const xStep = pointsCount > 1 ? chartWidth / (pointsCount - 1) : chartWidth;
  
  let pathD = '';
  let pointsHtml = '';
  let xAxisLabels = '';

  dataPoints.forEach((val, index) => {
    const x = paddingLeft + (index * xStep);
    const y = paddingTop + chartHeight - ((val / maxVal) * chartHeight);

    if (index === 0) {
      pathD = `M ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
    }

    // Interactive circular markers
    pointsHtml += `
      <circle cx="${x}" cy="${y}" r="4" fill="#0b0f19" stroke="${strokeColor}" stroke-width="2">
        <title>${labels[index]}: R$ ${val.toFixed(2)}</title>
      </circle>
    `;

    // Only render some x axis labels if there are too many
    const showLabel = pointsCount <= 12 || index % Math.ceil(pointsCount / 6) === 0 || index === pointsCount - 1;
    if (showLabel) {
      xAxisLabels += `
        <text class="chart-label-text" x="${x}" y="${height - paddingBottom + 20}" text-anchor="middle">
          ${labels[index]}
        </text>
      `;
    }
  });

  // Render SVG
  container.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
      <!-- Grid & Axes -->
      ${gridLines}
      <line class="chart-axis" x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${height - paddingBottom}" />
      <line class="chart-axis" x1="${paddingLeft}" y1="${height - paddingBottom}" x2="${width - paddingRight}" y2="${height - paddingBottom}" />
      
      <!-- Path -->
      <path class="chart-line" d="${pathD}" fill="none" stroke="${strokeColor}" />
      
      <!-- Markers -->
      ${pointsHtml}
      
      <!-- Labels -->
      ${yAxisLabels}
      ${xAxisLabels}
    </svg>
    <div class="chart-legend">
      <div class="legend-item">
        <span class="legend-dot" style="background-color: ${strokeColor}"></span>
        <span>${labelName}</span>
      </div>
    </div>
  `;
}
