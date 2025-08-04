export interface ForecastDataPoint {
  date: string;
  actualCost: number;
  predictedCost?: number;
  confidenceUpper?: number;
  confidenceLower?: number;
  isForecast: boolean;
}

export interface ForecastSummary {
  projectedTotalCost: number;
  projectedEndDate: string;
  currentBurnRate: number;
  averageDailyCost: number;
  forecastAccuracy: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ProjectBudget {
  projectId: string;
  projectName: string;
  budgetedCost: number;
  actualCost: number;
  projectedCost: number;
  variance: number;
  variancePercent: number;
  status: 'under_budget' | 'over_budget' | 'at_risk';
}

/**
 * Simple linear regression for trend analysis
 */
function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  const sumX = data.reduce((sum, point) => sum + point.x, 0);
  const sumY = data.reduce((sum, point) => sum + point.y, 0);
  const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
  const sumX2 = data.reduce((sum, point) => sum + point.x * point.x, 0);
  const sumY2 = data.reduce((sum, point) => sum + point.y * point.y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  const totalSumSquares = data.reduce((sum, point) => sum + Math.pow(point.y - yMean, 2), 0);
  const residualSumSquares = data.reduce((sum, point) => {
    const predicted = slope * point.x + intercept;
    return sum + Math.pow(point.y - predicted, 2);
  }, 0);
  const r2 = 1 - residualSumSquares / totalSumSquares;

  return { slope, intercept, r2: Math.max(0, r2) };
}

/**
 * Calculate moving average for smoothing
 */
function movingAverage(data: number[], windowSize: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
    const window = data.slice(start, end);
    const average = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(average);
  }
  return result;
}

/**
 * Generate cost forecast based on historical data
 */
export function generateCostForecast(
  historicalData: { date: string; cost: number }[],
  forecastDays: number = 30,
  confidenceLevel: number = 0.95
): ForecastDataPoint[] {
  if (historicalData.length < 3) {
    return historicalData.map(point => ({
      date: point.date,
      actualCost: point.cost,
      isForecast: false
    }));
  }

  // Sort data by date
  const sortedData = [...historicalData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Convert to regression format
  const startDate = new Date(sortedData[0].date).getTime();
  const regressionData = sortedData.map((point, index) => ({
    x: index,
    y: point.cost
  }));

  // Apply moving average smoothing for volatile data
  const costs = sortedData.map(d => d.cost);
  const smoothedCosts = movingAverage(costs, Math.min(7, Math.floor(costs.length / 3)));
  const smoothedRegressionData = smoothedCosts.map((cost, index) => ({ x: index, y: cost }));

  // Calculate trend line
  const { slope, intercept, r2 } = linearRegression(smoothedRegressionData);

  // Calculate standard error for confidence intervals
  const predictions = regressionData.map(point => slope * point.x + intercept);
  const residuals = regressionData.map((point, i) => point.y - predictions[i]);
  const standardError = Math.sqrt(residuals.reduce((sum, residual) => sum + residual * residual, 0) / (regressionData.length - 2));

  // Z-score for confidence level
  const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.576 : 1.645;

  // Create forecast data points
  const result: ForecastDataPoint[] = [];

  // Add historical data
  sortedData.forEach((point, index) => {
    const predicted = slope * index + intercept;
    result.push({
      date: point.date,
      actualCost: point.cost,
      predictedCost: predicted,
      isForecast: false
    });
  });

  // Add forecast points
  const lastDate = new Date(sortedData[sortedData.length - 1].date);
  for (let i = 1; i <= forecastDays; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);
    
    const x = sortedData.length - 1 + i;
    const predictedCost = Math.max(0, slope * x + intercept);
    
    // Adjust confidence interval based on how far into the future we're predicting
    const timeAdjustment = Math.sqrt(i); // Increase uncertainty with time
    const margin = zScore * standardError * timeAdjustment;
    
    result.push({
      date: forecastDate.toISOString().split('T')[0],
      actualCost: 0,
      predictedCost,
      confidenceUpper: Math.max(0, predictedCost + margin),
      confidenceLower: Math.max(0, predictedCost - margin),
      isForecast: true
    });
  }

  return result;
}

/**
 * Generate forecast summary
 */
export function generateForecastSummary(
  historicalData: { date: string; cost: number }[],
  forecastData: ForecastDataPoint[]
): ForecastSummary {
  if (historicalData.length < 2) {
    return {
      projectedTotalCost: 0,
      projectedEndDate: new Date().toISOString().split('T')[0],
      currentBurnRate: 0,
      averageDailyCost: 0,
      forecastAccuracy: 0,
      trend: 'stable',
      riskLevel: 'low'
    };
  }

  const sortedData = [...historicalData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Calculate current burn rate (recent 7 days average)
  const recentData = sortedData.slice(-7);
  const currentBurnRate = recentData.reduce((sum, point) => sum + point.cost, 0) / recentData.length;

  // Calculate average daily cost
  const totalCost = sortedData.reduce((sum, point) => sum + point.cost, 0);
  const averageDailyCost = totalCost / sortedData.length;

  // Project total cost based on forecast
  const forecastPoints = forecastData.filter(point => point.isForecast);
  const projectedTotalCost = totalCost + forecastPoints.reduce((sum, point) => sum + (point.predictedCost || 0), 0);

  // Determine trend
  const firstHalf = sortedData.slice(0, Math.floor(sortedData.length / 2));
  const secondHalf = sortedData.slice(Math.floor(sortedData.length / 2));
  const firstHalfAvg = firstHalf.reduce((sum, point) => sum + point.cost, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, point) => sum + point.cost, 0) / secondHalf.length;
  
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  const trendThreshold = 0.1; // 10% change threshold
  const percentChange = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;
  
  if (percentChange > trendThreshold) {
    trend = 'increasing';
  } else if (percentChange < -trendThreshold) {
    trend = 'decreasing';
  }

  // Calculate forecast accuracy (R-squared approximation)
  const actualVsPredicted = forecastData.filter(point => !point.isForecast && point.predictedCost);
  let forecastAccuracy = 0;
  if (actualVsPredicted.length > 1) {
    const actualMean = actualVsPredicted.reduce((sum, point) => sum + point.actualCost, 0) / actualVsPredicted.length;
    const totalSumSquares = actualVsPredicted.reduce((sum, point) => sum + Math.pow(point.actualCost - actualMean, 2), 0);
    const residualSumSquares = actualVsPredicted.reduce((sum, point) => {
      return sum + Math.pow(point.actualCost - (point.predictedCost || 0), 2);
    }, 0);
    forecastAccuracy = Math.max(0, Math.min(1, 1 - residualSumSquares / totalSumSquares));
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (trend === 'increasing' && percentChange > 0.3) {
    riskLevel = 'high';
  } else if (trend === 'increasing' || forecastAccuracy < 0.7) {
    riskLevel = 'medium';
  }

  // Project end date (assuming project continues at current rate)
  const lastDate = new Date(sortedData[sortedData.length - 1].date);
  const projectedEndDate = new Date(lastDate);
  projectedEndDate.setDate(projectedEndDate.getDate() + 30); // Default 30 days projection

  return {
    projectedTotalCost,
    projectedEndDate: projectedEndDate.toISOString().split('T')[0],
    currentBurnRate,
    averageDailyCost,
    forecastAccuracy,
    trend,
    riskLevel
  };
}

/**
 * Generate budget analysis for projects
 */
export function generateBudgetAnalysis(
  projectAnalytics: { name: string; cost: number }[],
  projectBudgets: { [projectName: string]: number } = {},
  forecastData: { [projectName: string]: number } = {}
): ProjectBudget[] {
  return projectAnalytics.map(project => {
    const budgetedCost = projectBudgets[project.name] || project.cost * 1.2; // Default to 120% of current if no budget set
    const projectedCost = forecastData[project.name] || project.cost * 1.1; // Default to 110% projection
    const variance = projectedCost - budgetedCost;
    const variancePercent = (variance / budgetedCost) * 100;

    let status: 'under_budget' | 'over_budget' | 'at_risk' = 'under_budget';
    if (variance > 0) {
      status = 'over_budget';
    } else if (variancePercent > -10) { // Within 10% of budget
      status = 'at_risk';
    }

    return {
      projectId: project.name,
      projectName: project.name,
      budgetedCost,
      actualCost: project.cost,
      projectedCost,
      variance,
      variancePercent,
      status
    };
  });
}

/**
 * Calculate seasonal adjustment factors
 */
export function calculateSeasonalFactors(
  historicalData: { date: string; cost: number }[],
  periods: number = 12 // Monthly seasonality by default
): number[] {
  if (historicalData.length < periods * 2) {
    return Array(periods).fill(1); // No adjustment if insufficient data
  }

  const monthlyTotals = Array(periods).fill(0);
  const monthlyCounts = Array(periods).fill(0);

  historicalData.forEach(point => {
    const date = new Date(point.date);
    const month = date.getMonth(); // 0-11
    monthlyTotals[month] += point.cost;
    monthlyCounts[month]++;
  });

  const monthlyAverages = monthlyTotals.map((total, i) => 
    monthlyCounts[i] > 0 ? total / monthlyCounts[i] : 0
  );

  const overallAverage = monthlyAverages.reduce((sum, avg) => sum + avg, 0) / periods;

  return monthlyAverages.map(avg => 
    overallAverage > 0 ? avg / overallAverage : 1
  );
}