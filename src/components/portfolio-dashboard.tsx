'use client';

import React from 'react';
import { Printer } from "lucide-react";
import * as XLSX from 'xlsx';
import {
  Card,
  CardContent,
  //CardDescription,
  //CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, Line, Area, Scatter,
    BarChart, Bar, Cell,
    PieChart, Pie
  } from 'recharts';

// Define interfaces for our data structures
interface ProjectData {
  'Project Name': string;
  'Contract Value': number | string;
  'Duration (Months)': number | string;
  'Time spending': number | string;
  'Start Date': string;
  'End Date': string;
  'SAP ID': string;
  Status: 'Ongoing' | 'Mobilisation' | 'Not Started';
  manpower: number | string;
}

interface BubbleDataPoint {
  name: string;
  'Contract Value': number;
  manpower: number;
  'Duration (Months)': number;
  status: ProjectData['Status'];
  progress: number;
}

interface RadarDataPoint {
  name: string;
  'Contract Value': number;
  Duration: number;
  Manpower: number;
  Progress: number;
}

type CriticalityLevel = 'High' | 'Medium' | 'Normal';

// interface CriticalityStyle {
//   bg: string;
//   text: string;
// }

// Constants
const STATUS_COLORS = {
  'Ongoing': '#0d9488',
  'Mobilisation': '#0369a1',
  'Not Started': '#64748b'
} as const;

const CRITICALITY_COLORS = {
  High: { bg: 'bg-red-100', text: 'text-red-800' },
  Medium: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  Normal: { bg: 'bg-green-100', text: 'text-green-800' }
} as const;

const PROJECT_CRITICALITY: Record<string, CriticalityLevel> = {
  'Commercial Boulevard District Lusail': 'High',
  'Korean Medical Center': 'Normal',
  'Al Seef Tower': 'Medium',
  'Pumping Stations': 'High',
  'QNB Tower': 'High',
  'QD Tower Lusail Plaza Tower Plot 4': 'Normal',
  'Lusail Plaza Tower # 1 (Plot 1)': 'High'
};

// Helper functions
const parseNumber = (value: any): number => {
  if (typeof value === 'string') {
    return parseFloat(value.replace(/,/g, '')) || 0;
  }
  return typeof value === 'number' ? value : 0;
};

const parsePercentage = (value: any): number => {
  if (typeof value === 'string') {
    return parseFloat(value.replace('%', '')) / 100 || 0;
  }
  return typeof value === 'number' ? value : 0;
};

const getCriticalityForProject = (projectName: string): CriticalityLevel => {
  return PROJECT_CRITICALITY[projectName] || 'Normal';
};

const calculateTimeRemaining = (endDateStr: string): number => {
    if (!endDateStr) return 0;

    try {
        // Split the date string by "-"
        const [day, monthStr, yearStr] = endDateStr.split('-');
        
        // Month mapping
        const monthMap: { [key: string]: number } = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };

        // Parse the components
        const dayNum = parseInt(day, 10);
        const monthNum = monthMap[monthStr];
        const yearNum = 2000 + parseInt(yearStr, 10); // Convert "26" to 2026

        // Create date objects
        const endDate = new Date(yearNum, monthNum, dayNum);
        const currentDate = new Date();

        // Calculate months difference
        const yearDiff = endDate.getFullYear() - currentDate.getFullYear();
        const monthDiff = endDate.getMonth() - currentDate.getMonth();
        const totalMonths = (yearDiff * 12) + monthDiff;

        // Add fractional month based on remaining days
        const dayDiff = endDate.getDate() - currentDate.getDate();
        const fractionalMonth = dayDiff / 30;

        return Math.max(0, Math.ceil(totalMonths + fractionalMonth));
    } catch (error) {
        console.error('Error calculating time remaining:', error);
        return 0;
    }
};

// const calculateProgress = (project: ProjectData): number => {
//   const startDate = new Date(project['Start Date']);
//   const endDate = new Date(project['End Date']);
//   const currentDate = new Date();

//   if (currentDate < startDate) return 0;
//   if (currentDate > endDate) return 100;

//   const totalDuration = endDate.getTime() - startDate.getTime();
//   const elapsedDuration = currentDate.getTime() - startDate.getTime();

//   return Math.round((elapsedDuration / totalDuration) * 100);
// };

// Chart wrapper components


class ChartErrorBoundary extends React.Component<
    {children: React.ReactNode},
    {hasError: boolean, error: Error | null}
> {
    constructor(props: {children: React.ReactNode}) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Chart Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                    <div className="text-center">
                        <p className="text-gray-500 mb-2">Unable to load chart</p>
                        <button 
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="text-sm text-blue-500 hover:text-blue-600"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const ChartWrapper: React.FC<{children: React.ReactElement}> = ({children}) => {
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
      const updateDimensions = () => {
          if (chartRef.current) {
              setDimensions({
                  width: chartRef.current.offsetWidth,
                  height: chartRef.current.offsetHeight
              });
          }
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);

      // Initial timeout to ensure proper rendering
      const timeout = setTimeout(updateDimensions, 100);

      return () => {
          window.removeEventListener('resize', updateDimensions);
          clearTimeout(timeout);
      };
  }, []);

  return (
      <div ref={chartRef} className="h-96 w-full" style={{ minHeight: '400px' }}>
          {dimensions.width > 0 && dimensions.height > 0 && (
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  {children}
              </ResponsiveContainer>
          )}
      </div>
  );
};

const PortfolioDashboard = () => {
  const [data, setData] = React.useState<ProjectData[]>([]);
  const [loading, setLoading] = React.useState(true);

    // const handlePrint = () => {
    //     document.body.classList.add('first-page'); // Apply class for first page
    //     setTimeout(() => {
    //       window.print();
    //       setTimeout(() => {
    //         document.body.classList.remove('first-page'); // Remove after printing
    //       }, 500);
    //     }, 200);
    // };     
    const handlePrint = () => {
      window.print();
    };
    React.useEffect(() => {
      const fetchData = async () => {
          try {
              setLoading(true);
              const response = await fetch('./One Page Portfolio.xlsx');
              if (!response.ok) {
                  throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
              }
              
              const arrayBuffer = await response.arrayBuffer();
              const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
                  type: 'array',
                  cellDates: false,
                  cellNF: true,
                  cellText: false,
                  cellStyles: true,
              });
              
              const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
              const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
                  raw: false,
                  dateNF: 'dd/mm/yyyy'
              }) as ProjectData[];
              
              // Validate and filter data
              const validData = jsonData.filter(item => 
                  item['Project Name'] && 
                  item['Project Name'] !== 'Total' &&
                  item.Status in STATUS_COLORS
              );
              
              setData(validData);
          } catch (error) {
              console.error('Error loading data:', error);
          } finally {
              setLoading(false);
          }
      };
  
      fetchData();
    }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Loading portfolio data...</div>
      </div>
    );
  }

  const totalContractValue = data.reduce((sum, project) => 
    sum + parseNumber(project['Contract Value']), 0);
  const totalManpower = data.reduce((sum, project) => 
    sum + parseNumber(project.manpower), 0);

  // Prepare chart data
  const radarData: RadarDataPoint[] = data.map(project => ({
    name: project['Project Name'],
    'Contract Value': (parseNumber(project['Contract Value']) / totalContractValue) * 100,
    'Duration': (parseNumber(project['Duration (Months)']) / 
      data.reduce((max, p) => Math.max(max, parseNumber(p['Duration (Months)'])), 0)) * 100,
    'Manpower': (parseNumber(project.manpower) / totalManpower) * 100,
    'Progress': parsePercentage(project['Time spending']) * 100
  }));

  const bubbleData: BubbleDataPoint[] = data
    .map(project => ({
        name: project['Project Name'],
        'Contract Value': parseNumber(project['Contract Value']) / 1000000,
        manpower: parseNumber(project.manpower),
        'Duration (Months)': parseNumber(project['Duration (Months)']),
        status: project.Status,
        progress: parsePercentage(project['Time spending']) * 100
    }))
    .sort((a, b) => a['Contract Value'] - b['Contract Value']); // Add this sort function

  const PrintFooter = () => {
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    return (
      <div className="hidden print:block print-footer" style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          backgroundColor: 'white',
          borderTop: '1px solid #e5e7eb',
          zIndex: 9999
      }}>
        <div className="flex justify-between items-center text-gray-600 px-8 py-4 w-full">
          <div className="flex items-center gap-4">
            <span className="font-medium">Portfolio Dashboard</span>
            <span className="text-gray-400">|</span>
            <span>Yahya Chaker - FM Projects Director</span>
          </div>
          <div className="flex items-center">
            <span>{currentDate}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* First Page Content */}
        <div className="first-page">
          {/* Portfolio Overview */}
          <div className="mb-6 bg-white rounded-xl shadow-lg p-6 border border-teal-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-light text-gray-800 mb-2">Portfolio Overview</h1>
                <p className="text-gray-500 text-xl">Yahya Chaker</p>
                <p className="text-gray-500 text-lg">FM Projects Director</p>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-4xl font-light text-teal-600">{data.length}</p>
                  <p className="text-sm text-gray-500">Projects</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-light text-teal-600">{(totalContractValue / 1000000).toFixed(1)}M</p>
                  <p className="text-sm text-gray-500">QAR Value</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-light text-teal-600">{totalManpower}</p>
                  <p className="text-sm text-gray-500">Personnel</p>
                </div>
              </div>
              <div className="border-l border-gray-200 pl-8">
                <img 
                  src="/Elegancia_Logo.png" 
                  alt="Elegancia Logo" 
                  className="h-16 w-auto"
                />
            </div>
          </div>
        </div>

          {/* All Charts Row */}
          <div className="flex gap-6 mb-8">
            {/* Project Values Chart */}
            <Card className="bg-white shadow-lg flex-1">
              <CardHeader>
                <CardTitle className="text-xl font-light">Project Contract Values</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartErrorBoundary>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.map(project => ({
                          name: project['Project Name'],
                          value: parseNumber(project['Contract Value']) / 1000000
                        }))}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" unit="M" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={170}
                          tick={{ 
                            fontSize: 11,
                            fill: '#4B5563'
                          }}
                        />
                        <Tooltip 
                          formatter={(value) => `${typeof value === 'number' ? value.toFixed(1) : value}M QAR`}
                        />
                        <Bar dataKey="value" fill="#0d9488">
                          {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.Status]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartErrorBoundary>
              </CardContent>
            </Card>

            {/* Project Value vs Resources Chart */}
            <Card className="bg-white shadow-lg flex-1">
              <CardHeader>
                <CardTitle className="text-xl font-light">Project Value vs Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartErrorBoundary>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={bubbleData}>
                        <CartesianGrid strokeDasharray="6 6" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="Contract Value" 
                          tickFormatter={(value) => Math.round(value).toString()}            
                          label={{ 
                            value: 'Contract Value (M QAR)', 
                            position: 'bottom',
                            offset: -7,
                            sort: true
                          }}
                        />
                        <YAxis dataKey="manpower" label={{ value: 'Manpower', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Scatter name="Projects" data={bubbleData} fill="#0d9488">
                          {bubbleData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={STATUS_COLORS[entry.status]}
                              opacity={0.7}
                            />
                          ))}
                        </Scatter>
                        <Area type="monotone" dataKey="progress" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.1} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </ChartErrorBoundary>
              </CardContent>
            </Card>

            {/* Time Allocation Pie Chart */}
            <Card className="bg-white shadow-lg flex-1">
              <CardHeader>
                <CardTitle className="text-xl font-light">Projects Time Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col h-[350px]">
                  {/* Pie Chart */}
                  <ChartErrorBoundary>
                    <div className="flex-1 h-full">
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                          <Pie
                            data={data.map(project => ({
                              name: project['Project Name'],
                              value: parseNumber(project['Time spending'])
                            }))}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}      // Reduced from 120
                            innerRadius={10}      // Reduced from 80
                            dataKey="value"
                            nameKey="name"
                            label={({
                              cx,
                              cy,
                              midAngle,
                              innerRadius,
                              outerRadius,
                              value,
                              name
                            }) => {
                              const RADIAN = Math.PI / 180;
                              const radius = outerRadius + 15;  // Reduced from 25
                              const x = cx + radius * Math.cos(-midAngle * RADIAN);
                              const y = cy + radius * Math.sin(-midAngle * RADIAN);

                              // Split name if longer than 15 characters
                              const words = name.split(' ');
                              const firstLine = words.slice(0, 2).join(' ');
                              const secondLine = words.slice(2).join(' ');

                              return (
                                <g>
                                  <text
                                    x={x}
                                    y={y - 6}  // Move up for first line
                                    fill="#4B5563"
                                    textAnchor={x > cx ? 'start' : 'end'}
                                    fontSize="9"  // Reduced from 11
                                  >
                                    {firstLine}
                                  </text>
                                  {secondLine && (
                                    <text
                                      x={x}
                                      y={y + 6}  // Move down for second line
                                      fill="#4B5563"
                                      textAnchor={x > cx ? 'start' : 'end'}
                                      fontSize="9"  // Reduced from 11
                                    >
                                      {`${secondLine} (${value}%)`}
                                    </text>
                                  )}
                                  {!secondLine && (
                                    <text
                                      x={x}
                                      y={y + 6}  // Value on second line if no second line of text
                                      fill="#4B5563"
                                      textAnchor={x > cx ? 'start' : 'end'}
                                      fontSize="9"
                                    >
                                      {`(${value}%)`}
                                    </text>
                                  )}
                                </g>
                              );
                            }}
                            labelLine={true}
                          >
                            {data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.Status]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => `${value}%`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartErrorBoundary>

                  {/* Status Legend */}
                  <div className="flex justify-center gap-4 mt-4">
                    {Object.entries(STATUS_COLORS).map(([status, color]) => (
                      <div key={status} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm text-gray-600">{status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Second Page Content */}
        <div className="time-allocation-section page-break">               
          {/* Time Allocation Section */}
          <Card className="bg-white shadow-lg mb-8 page-break">
            <CardHeader>
              <CardTitle className="text-xl font-light">Project Time Allocation & Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.map((project, index) => {
                  const timeSpent = parsePercentage(project['Time spending']);
                  return (
                    <div key={index} className="relative">
                      <div className="flex items-center mb-4">
                        <div className="w-1/4">
                          <h3 className="text-sm font-medium text-gray-900">{project['Project Name']}</h3>
                          <p className="text-xs text-gray-500">SAP ID: {project['SAP ID']}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Total Duration: {project['Duration (Months)']} months
                          </p>
                        </div>
                        <div className="w-3/4">
                          <div className="relative h-6 bg-gray-100 rounded-lg overflow-hidden">
                            <div
                              className="absolute top-0 left-0 h-full transition-all duration-500"
                              style={{
                                width: `${timeSpent * 100}%`,
                                backgroundColor: STATUS_COLORS[project.Status]
                              }}
                            />
                            <div 
                              className="absolute top-0 left-0 h-full flex items-center" 
                              style={{ marginLeft: `${Math.min(timeSpent * 100 + 1, 95)}%` }}
                            >
                              <span className="text-xs text-gray-700 font-medium whitespace-nowrap">
                                {(timeSpent * 100).toFixed(0)}% allocated time
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between mt-2">
                            <div className="text-xs">
                              <span className="text-gray-600 font-medium">Start: </span>
                              <span className="text-gray-500">{project['Start Date']}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-gray-600 font-medium">Time Remaining: </span>
                              <span className="text-gray-500">
                                {calculateTimeRemaining(project['End Date'])} months
                              </span>
                            </div>
                            <div className="text-xs">
                              <span className="text-gray-600 font-medium">End: </span>
                              <span className="text-gray-500">{project['End Date']}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Third Page Content */}
        <div className="project-details-section page-break">
          {/* Project Details Table */}
          <Card className="bg-white shadow-lg page-break">
            <CardHeader>
              <CardTitle className="text-xl font-light">Project Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value (QAR)</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manpower</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criticality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.map((project, index) => {
                      const criticality = getCriticalityForProject(project['Project Name']);
                      const criticalityStyle = CRITICALITY_COLORS[criticality];

                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{project['Project Name']}</div>
                            <div className="text-xs text-gray-500">{project['SAP ID']}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {(parseNumber(project['Contract Value'])/1000000).toFixed(1)}M
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{parseNumber(project.manpower)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              project.Status === 'Ongoing' ? 'bg-teal-100 text-teal-800' :
                              project.Status === 'Mobilisation' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {project.Status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${criticalityStyle.bg} ${criticalityStyle.text}`}>
                              {criticality}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 font-medium">
                      <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{(totalContractValue/1000000).toFixed(1)}M</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{totalManpower}</td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Print Button */}
        <div className="fixed bottom-8 right-8 no-print">
          <button 
            onClick={handlePrint}
            className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-md"
          >
            <Printer className="h-5 w-5" />
            Print Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortfolioDashboard;