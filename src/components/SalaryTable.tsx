import React, { useEffect, useState, useRef } from 'react';
import { Table, Typography, Card, Spin, Empty } from 'antd';
import { Line } from '@ant-design/charts';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

interface SalaryData {
  year: number;
  totalJobs: number;
  avgSalary: number;
}

interface JobTitleData {
  title: string;
  count: number;
}

const SalaryTable: React.FC = () => {
  const [salaryData, setSalaryData] = useState<SalaryData[]>([]);
  const [jobTitleData, setJobTitleData] = useState<JobTitleData[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const jobTitleSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/salaries.csv')
      .then((response) => response.arrayBuffer())
      .then((data) => {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        const yearData: Record<number, { totalJobs: number, totalSalary: number }> = {};
        const titleData: Record<number, Record<string, number>> = {};

        jsonData.forEach((row: any) => {
          const year = parseInt(row['work_year'], 10);
          const salary_in_usd = parseFloat(row['salary_in_usd']);
          const title = row['job_title'];

          if (!yearData[year]) {
            yearData[year] = { totalJobs: 0, totalSalary: 0 };
          }
          if (!titleData[year]) {
            titleData[year] = {};
          }

          yearData[year].totalJobs += 1;
          yearData[year].totalSalary += salary_in_usd;

          titleData[year][title] = (titleData[year][title] || 0) + 1;
        });

        const formattedData: SalaryData[] = Object.keys(yearData).map((year) => ({
          year: parseInt(year),
          totalJobs: yearData[parseInt(year)].totalJobs,
          avgSalary: yearData[parseInt(year)].totalSalary / yearData[parseInt(year)].totalJobs,
        }));

        setSalaryData(formattedData);

        if (selectedYear !== null) {
          const aggregatedTitles = Object.keys(titleData[selectedYear]).map((title) => ({
            title,
            count: titleData[selectedYear][title],
          }));
          setJobTitleData(aggregatedTitles);
        }

        setLoading(false);
      });
  }, [selectedYear]);

  const handleRowClick = (record: SalaryData) => {
    setSelectedYear(record.year);

    setTimeout(() => {
      if (jobTitleSectionRef.current) {
        jobTitleSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const columns = [
    { title: 'Year', dataIndex: 'year', sorter: (a: SalaryData, b: SalaryData) => a.year - b.year },
    { title: 'Total Jobs', dataIndex: 'totalJobs', sorter: (a: SalaryData, b: SalaryData) => a.totalJobs - b.totalJobs },
    { title: 'Average Salary (USD)', dataIndex: 'avgSalary', sorter: (a: SalaryData, b: SalaryData) => a.avgSalary - b.avgSalary },
  ];

  const lineChartConfig = {
    data: salaryData,
    xField: 'year',
    yField: 'totalJobs',
    point: { size: 5, shape: 'diamond' },
    label: { 
      style: { 
        fill: '#aaa' 
      } 
    },
    smooth: true,
  };

  const jobTitleColumns = [
    { title: 'Job Title', dataIndex: 'title' },
    { title: 'Count', dataIndex: 'count' },
  ];

  return (
    <div className="p-4 space-y-4">
      <Title level={1} className="text-xl font-semibold mb-4">ML Engineer Salaries</Title>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      ) : salaryData.length > 0 ? (
        <>
          <Card className="shadow-lg p-4 mb-4">
            <Text className="block mb-2 text-sm text-gray-600">
              Click on any row to see job titles for that year.
            </Text>
            <Table 
              dataSource={salaryData} 
              columns={columns} 
              rowKey="year" 
              onRow={(record) => ({
                onClick: () => handleRowClick(record),
              })}
              className="mb-4"
              rowClassName="cursor-pointer hover:bg-gray-100"
            />
          </Card>
            {selectedYear !== null && (
              <Card className="shadow-lg p-4 mb-4">
              <div ref={jobTitleSectionRef}>
                <Title level={2} className="text-lg font-medium mb-2">Job Titles for {selectedYear}</Title>
                {jobTitleData.length > 0 ? (
                  <Table dataSource={jobTitleData} columns={jobTitleColumns} rowKey="title" />
                ) : (
                  <Empty description={`No job titles available for ${selectedYear}`} />
                )}
              </div>
              </Card>
            )}
          <Card className="shadow-lg p-4 mb-4">
            <Line {...lineChartConfig} />
          </Card>
        </>
      ) : (
        <Empty description="No salary data available." />
      )}
    </div>
  );
};

export default SalaryTable;
