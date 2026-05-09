import Link from "next/link"
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Clock,
  GitBranch,
  TrendingUp,
  Users,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  DashboardGrid,
  DashboardHeader,
  DashboardSection,
  DashboardShell,
} from "@/components/dashboard-shell"

export default function DashboardPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Dashboard"
        description="Overview of your hiring pipeline and candidate analytics."
      >
        <Button variant="outline" size="sm">
          Export Report
        </Button>
        <Button size="sm">Add Candidate</Button>
      </DashboardHeader>

      {/* Stats Grid */}
      <DashboardSection>
        <DashboardGrid columns={4}>
          <StatCard
            title="Total Candidates"
            value="2,847"
            change={12.5}
            changeLabel="from last month"
            icon={Users}
          />
          <StatCard
            title="Active Jobs"
            value="24"
            change={4.3}
            changeLabel="from last month"
            icon={Briefcase}
          />
          <StatCard
            title="In Pipeline"
            value="156"
            change={-2.1}
            changeLabel="from last week"
            icon={GitBranch}
          />
          <StatCard
            title="Avg. Time to Hire"
            value="18 days"
            change={-8.2}
            changeLabel="from last quarter"
            icon={Clock}
            positive
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Recent Activity */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">
              Recent Candidates
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary">
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {recentCandidates.map((candidate) => (
              <CandidateRow key={candidate.id} candidate={candidate} />
            ))}
          </CardContent>
        </Card>

        {/* Pipeline Summary */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Pipeline Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pipelineStages.map((stage) => (
              <PipelineStage key={stage.name} stage={stage} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Top Matches */}
      <DashboardSection>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Top Matches This Week</h2>
          <Button variant="ghost" size="sm" className="text-primary">
            View all matches
          </Button>
        </div>
        <DashboardGrid columns={3}>
          {topMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </DashboardGrid>
      </DashboardSection>
    </DashboardShell>
  )
}

// Components

function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  positive,
}: {
  title: string
  value: string
  change: number
  changeLabel: string
  icon: React.ElementType
  positive?: boolean
}) {
  const isPositive = positive !== undefined ? positive : change > 0

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="mt-2">
          <span className="stat-value">{value}</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs">
          {isPositive ? (
            <ArrowUpRight className="size-3 text-signal-high" />
          ) : (
            <ArrowDownRight className="size-3 text-signal-low" />
          )}
          <span className={isPositive ? "text-signal-high" : "text-signal-low"}>
            {Math.abs(change)}%
          </span>
          <span className="text-muted-foreground">{changeLabel}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function CandidateRow({
  candidate,
}: {
  candidate: (typeof recentCandidates)[0]
}) {
  return (
    <Link
      href={`/candidates/${candidate.id}`}
      className="flex items-center gap-4 border-b px-6 py-3 last:border-0 transition-colors hover:bg-muted/50"
    >
      <Avatar className="size-9">
        <AvatarImage src={candidate.avatar} alt={candidate.name} />
        <AvatarFallback className="text-xs">
          {candidate.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{candidate.name}</span>
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-xs font-normal"
          >
            {candidate.matchScore}% match
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {candidate.role} &middot; {candidate.github}
        </p>
      </div>
      <div className="text-right">
        <Badge
          variant="outline"
          className={`text-xs ${getStageColor(candidate.stage)}`}
        >
          {candidate.stage}
        </Badge>
        <p className="mt-0.5 text-xs text-muted-foreground">{candidate.added}</p>
      </div>
    </Link>
  )
}

function PipelineStage({ stage }: { stage: (typeof pipelineStages)[0] }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span>{stage.name}</span>
        <span className="font-mono text-muted-foreground">{stage.count}</span>
      </div>
      <Progress value={stage.percentage} className="h-1.5" />
    </div>
  )
}

function MatchCard({ match }: { match: (typeof topMatches)[0] }) {
  return (
    <Card className="transition-colors hover:bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-10">
            <AvatarImage src={match.avatar} alt={match.name} />
            <AvatarFallback>
              {match.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{match.name}</span>
              <span className="font-mono text-sm text-signal-high">
                {match.score}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{match.github}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {match.skills.map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="h-5 px-1.5 text-xs font-normal"
            >
              {skill}
            </Badge>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>{match.commits} commits</span>
          <span>{match.repos} repositories</span>
        </div>
      </CardContent>
    </Card>
  )
}

function getStageColor(stage: string) {
  switch (stage) {
    case "New":
      return "border-signal-high/30 text-signal-high"
    case "Screening":
      return "border-signal-medium/30 text-signal-medium"
    case "Interview":
      return "border-primary/30 text-primary"
    case "Offer":
      return "border-chart-3/30 text-chart-3"
    default:
      return ""
  }
}

// Mock Data

const recentCandidates = [
  {
    id: 1,
    name: "Sarah Chen",
    role: "Senior Frontend Engineer",
    github: "@sarahchen",
    avatar: "",
    matchScore: 94,
    stage: "Interview",
    added: "2h ago",
  },
  {
    id: 2,
    name: "Marcus Rodriguez",
    role: "Full Stack Developer",
    github: "@mrodriguez",
    avatar: "",
    matchScore: 89,
    stage: "Screening",
    added: "5h ago",
  },
  {
    id: 3,
    name: "Emily Watson",
    role: "Backend Engineer",
    github: "@emwatson",
    avatar: "",
    matchScore: 87,
    stage: "New",
    added: "1d ago",
  },
  {
    id: 4,
    name: "James Kim",
    role: "DevOps Engineer",
    github: "@jameskim",
    avatar: "",
    matchScore: 82,
    stage: "Offer",
    added: "2d ago",
  },
]

const pipelineStages = [
  { name: "New", count: 48, percentage: 31 },
  { name: "Screening", count: 32, percentage: 21 },
  { name: "Technical", count: 28, percentage: 18 },
  { name: "Interview", count: 24, percentage: 15 },
  { name: "Offer", count: 12, percentage: 8 },
  { name: "Hired", count: 12, percentage: 7 },
]

const topMatches = [
  {
    id: 1,
    name: "Alex Morgan",
    github: "@alexmorgan",
    avatar: "",
    score: 96,
    skills: ["TypeScript", "React", "Node.js"],
    commits: "2.4k",
    repos: 47,
  },
  {
    id: 2,
    name: "Jordan Lee",
    github: "@jordanlee",
    avatar: "",
    score: 94,
    skills: ["Python", "ML", "FastAPI"],
    commits: "1.8k",
    repos: 32,
  },
  {
    id: 3,
    name: "Taylor Swift",
    github: "@tswift_dev",
    avatar: "",
    score: 91,
    skills: ["Go", "Kubernetes", "AWS"],
    commits: "3.1k",
    repos: 56,
  },
]
