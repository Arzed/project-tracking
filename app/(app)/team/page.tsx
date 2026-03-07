'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { TeamMember } from '@/lib/types'

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const teamOptions: Array<{ value: TeamMember['team']; label: string }> = [
    { value: 'developer', label: 'Developer' },
    { value: 'designer', label: 'Designer' },
  ]
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    team: 'developer' as TeamMember['team'],
  })

  const formatTeamLabel = (team: TeamMember['team']) => (team === 'designer' ? 'Designer' : 'Developer')
  const normalizeTeam = (team: any): TeamMember['team'] =>
    team === 'designer' || team === 'design' ? 'designer' : 'developer'

  useEffect(() => {
    fetchTeamMembers()
  }, [])

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch('/api/team')
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setTeamMembers(list.map((m) => ({ ...m, team: normalizeTeam(m.team ?? m.role) })))
    } catch (error) {
      console.error('Failed to fetch team members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (member?: TeamMember) => {
    if (member) {
      setEditingMember(member)
      setFormData({
        name: member.name,
        email: member.email,
        team: normalizeTeam((member as any).team ?? (member as any).role),
      })
    } else {
      setEditingMember(null)
      setFormData({ name: '', email: '', team: 'developer' })
    }
    setOpenModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const method = editingMember ? 'PUT' : 'POST'
      const body = editingMember
        ? { ...formData, id: editingMember.id }
        : formData

      const res = await fetch('/api/team', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        fetchTeamMembers()
        setOpenModal(false)
      }
    } catch (error) {
      console.error('Failed to save team member:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (res.ok) {
        fetchTeamMembers()
      }
    } catch (error) {
      console.error('Failed to delete team member:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading team members...</p>
      </div>
    )
  }

  const developers = teamMembers.filter((m) => m.team === 'developer')
  const designers = teamMembers.filter((m) => m.team === 'designer')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Team</h1>
        <Button onClick={() => handleOpenModal()}>Add Team Member</Button>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-foreground">Developer Team</h2>
            <p className="text-sm text-muted-foreground">{developers.length} members</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {developers.map((member) => (
              <Card key={member.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{member.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{member.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Team</p>
                    <p className="font-medium">{formatTeamLabel(member.team)}</p>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button size="sm" variant="outline" onClick={() => handleOpenModal(member)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(member.id)}>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-foreground">Designer Team</h2>
            <p className="text-sm text-muted-foreground">{designers.length} members</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {designers.map((member) => (
              <Card key={member.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{member.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{member.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Team</p>
                    <p className="font-medium">{formatTeamLabel(member.team)}</p>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button size="sm" variant="outline" onClick={() => handleOpenModal(member)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(member.id)}>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMember ? 'Edit Team Member' : 'Add Team Member'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
                required
              />
            </div>

            <div>
              <Label htmlFor="team">Team</Label>
              <Select
                value={formData.team}
                onValueChange={(val) =>
                  setFormData({ ...formData, team: val as TeamMember['team'] })
                }
              >
                <SelectTrigger id="team">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teamOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
