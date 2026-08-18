import React, { useState } from 'react';
import { Plus, X, MapPin, Wallet, ShieldCheck } from 'lucide-react';

export default function CreateGroupModal({ onClose, onCreateGroup }) {
  const [name, setName] = useState('');
  const [hubLocation, setHubLocation] = useState('Watt Market, Calabar');
  const [description, setDescription] = useState('');
  const [contributionAmount, setContributionAmount] = useState('50000');
  const [frequency, setFrequency] = useState('Weekly');
  const [penaltyFee, setPenaltyFee] = useState('2000');
  const [trustee, setTrustee] = useState('');
  const [trusteeContact, setTrusteeContact] = useState('');
  const [memberCount, setMemberCount] = useState('6');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !contributionAmount) return;

    // Generate initial members based on authentic Nigerian names
    const memberTemplates = [
      { name: trustee || 'Mama Blessing (Trustee)', role: 'Iya Ajo / Trustee', phone: trusteeContact || '08030001122' },
      { name: 'Effiong Bassey', role: 'Member', phone: '08021113344' },
      { name: 'Ekaette Okon', role: 'Member', phone: '08134445566' },
      { name: 'Chief Asuquo Henshaw', role: 'Member', phone: '07036667788' },
      { name: 'Grace Archibong', role: 'Member', phone: '08058889900' },
      { name: 'Babajide Adeleke', role: 'Member', phone: '08031112233' },
      { name: 'Chinyere Nwosu', role: 'Member', phone: '08129994455' },
      { name: 'Peace Itam', role: 'Member', phone: '09012224455' }
    ];

    const count = parseInt(memberCount, 10) || 6;
    const members = memberTemplates.slice(0, count).map((m, idx) => ({
      id: `m-new-${Date.now()}-${idx}`,
      name: m.name,
      role: idx === 0 ? 'Group Leader / Trustee' : 'Member',
      phone: m.phone,
      bank: idx % 2 === 0 ? 'Moniepoint MFB' : 'Zenith Bank',
      accountNumber: `20${Math.floor(10000000 + Math.random() * 90000000)}`,
      trustScore: 95,
      position: idx + 1
    }));

    const amountNum = parseFloat(contributionAmount);
    const totalPayoutPerCycle = amountNum * count;

    // Build initial schedule
    const payoutSchedule = members.map((m, idx) => ({
      cycle: idx + 1,
      memberId: m.id,
      amount: totalPayoutPerCycle,
      date: new Date(Date.now() + (idx + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: idx === 0 ? 'Current Target' : 'Upcoming',
      ref: null
    }));

    const newGroup = {
      id: `group-${Date.now()}`,
      name,
      hubLocation: hubLocation || 'Nigeria',
      description: description || `Group thrift pool based in ${hubLocation || 'Nigeria'}.`,
      contributionAmount: amountNum,
      frequency,
      penaltyFee: parseFloat(penaltyFee) || 0,
      startDate: new Date().toISOString().split('T')[0],
      currentCycleIndex: 1,
      totalCycles: count,
      trustee: trustee || 'Mama Blessing',
      trusteeContact: trusteeContact || '08030001122',
      members,
      contributions: { 1: [] },
      payoutSchedule
    };

    onCreateGroup(newGroup);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Create New Ajo Group
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Set group name, custom location, contribution rules & members
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Group Title */}
          <div className="form-group">
            <label>Ajo Group Name:</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="e.g. Balogun Fashion Guild, Watt Market Fabric Ajo, Wuse Market Traders..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Location Hub (Free text input) */}
          <div className="form-group">
            <label>Location / City / Market Tag:</label>
            <input 
              type="text"
              className="form-control"
              placeholder="e.g. Watt Market Calabar, Balogun Market Lagos, Wuse Abuja, Ariaria Aba..."
              value={hubLocation}
              onChange={(e) => setHubLocation(e.target.value)}
              required
            />
          </div>

          {/* Contribution Amount & Frequency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Contribution Amount (₦):</label>
              <input 
                type="number" 
                className="form-control"
                placeholder="50000"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Contribution Frequency:</label>
              <select 
                className="form-control"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="Weekly">Weekly</option>
                <option value="Bi-Weekly">Bi-Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Late Penalty & Initial Member Count */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Late Penalty Fee (₦):</label>
              <input 
                type="number" 
                className="form-control"
                placeholder="2000"
                value={penaltyFee}
                onChange={(e) => setPenaltyFee(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Initial Member Count:</label>
              <select 
                className="form-control"
                value={memberCount}
                onChange={(e) => setMemberCount(e.target.value)}
              >
                <option value="4">4 Members</option>
                <option value="6">6 Members</option>
                <option value="8">8 Members</option>
              </select>
            </div>
          </div>

          {/* Trustee / Group Leader Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Trustee / Iya Ajo Name:</label>
              <input 
                type="text" 
                className="form-control"
                placeholder="e.g. Mama Blessing"
                value={trustee}
                onChange={(e) => setTrustee(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Trustee Contact Phone:</label>
              <input 
                type="text" 
                className="form-control"
                placeholder="08030001122"
                value={trusteeContact}
                onChange={(e) => setTrusteeContact(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus className="w-4 h-4" /> Create Ajo Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
