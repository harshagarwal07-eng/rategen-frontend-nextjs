"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Employee {
  id: number;
  name: string;
  position: string;
  department: string;
  status: "active" | "inactive" | "on-leave";
  email: string;
  phone: string;
  location: string;
  startDate: string;
  salary: string;
  projects: string[];
  skills: string[];
}

const employees: Employee[] = [
  {
    id: 1,
    name: "John Doe",
    position: "Senior Developer",
    department: "Engineering",
    status: "active",
    email: "john.doe@company.com",
    phone: "+1 (555) 123-4567",
    location: "New York, NY",
    startDate: "2022-01-15",
    salary: "$95,000",
    projects: ["Project Alpha", "Dashboard Redesign", "API Migration"],
    skills: ["React", "TypeScript", "Node.js", "PostgreSQL"],
  },
  {
    id: 2,
    name: "Jane Smith",
    position: "Product Manager",
    department: "Product",
    status: "active",
    email: "jane.smith@company.com",
    phone: "+1 (555) 234-5678",
    location: "San Francisco, CA",
    startDate: "2021-08-20",
    salary: "$110,000",
    projects: [
      "Mobile App Launch",
      "User Research Initiative",
      "Feature Roadmap",
    ],
    skills: ["Product Strategy", "User Research", "Agile", "Analytics"],
  },
  {
    id: 3,
    name: "Mike Johnson",
    position: "UX Designer",
    department: "Design",
    status: "on-leave",
    email: "mike.johnson@company.com",
    phone: "+1 (555) 345-6789",
    location: "Austin, TX",
    startDate: "2023-03-10",
    salary: "$85,000",
    projects: ["Design System", "Mobile App UI", "Website Refresh"],
    skills: ["Figma", "Prototyping", "User Testing", "Design Systems"],
  },
  {
    id: 4,
    name: "Sarah Wilson",
    position: "Data Analyst",
    department: "Analytics",
    status: "active",
    email: "sarah.wilson@company.com",
    phone: "+1 (555) 456-7890",
    location: "Chicago, IL",
    startDate: "2022-11-05",
    salary: "$75,000",
    projects: ["Sales Dashboard", "Customer Insights", "Performance Metrics"],
    skills: ["SQL", "Python", "Tableau", "Statistics"],
  },
  {
    id: 5,
    name: "David Brown",
    position: "DevOps Engineer",
    department: "Engineering",
    status: "inactive",
    email: "david.brown@company.com",
    phone: "+1 (555) 567-8901",
    location: "Seattle, WA",
    startDate: "2020-06-12",
    salary: "$105,000",
    projects: ["Infrastructure Upgrade", "CI/CD Pipeline", "Security Audit"],
    skills: ["AWS", "Docker", "Kubernetes", "Terraform"],
  },
];

const getStatusColor = (status: Employee["status"]) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "inactive":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    case "on-leave":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  }
};

export function CollapsibleTable() {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (id: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <>
              <TableRow
                key={employee.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleRow(employee.id)}
              >
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {expandedRows.has(employee.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell>{employee.position}</TableCell>
                <TableCell>{employee.department}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={getStatusColor(employee.status)}
                  >
                    {employee.status.replace("-", " ")}
                  </Badge>
                </TableCell>
              </TableRow>
              {expandedRows.has(employee.id) && (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <Card className="border-0 shadow-none">
                      <CardContent className="p-6 bg-muted/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {/* Contact Information */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                              Contact Information
                            </h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{employee.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{employee.phone}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{employee.location}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>Started {employee.startDate}</span>
                              </div>
                            </div>
                          </div>

                          {/* Projects */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                              Current Projects
                            </h4>
                            <div className="space-y-2">
                              {employee.projects.map((project, index) => (
                                <div
                                  key={index}
                                  className="text-sm bg-background rounded-md px-3 py-2 border"
                                >
                                  {project}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Skills & Salary */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                              Skills & Compensation
                            </h4>
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-medium mb-2">
                                  Annual Salary
                                </p>
                                <p className="text-lg font-bold text-primary">
                                  {employee.salary}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium mb-2">
                                  Key Skills
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {employee.skills.map((skill, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
