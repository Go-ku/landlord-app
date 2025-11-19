'use client';

import Link from 'next/link';
import {
  Building2,
  Smartphone,
  ShieldCheck,
  CreditCard,
  Receipt,
  BellRing,
  Wrench,
  Users,
  ClipboardList,
  TrendingUp,
  CalendarCheck,
  MapPin,
  Clock4,
  ChevronRight,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  UserCog,
  Home,
  FileText,
  ArrowUpRight,
  Mail,
  Phone
} from 'lucide-react';

const roleAccess = [
  {
    title: 'System Admin (You)',
    description: 'Full visibility, onboarding, security controls and Zambia-wide oversight.',
    permissions: [
      'Invite landlords, managers, and maintenance teams',
      'Manage billing plans and audit logs',
      'Configure rent increase policies per lease'
    ],
    accent: 'from-sky-500/20 to-blue-500/10',
    icon: ShieldCheck
  },
  {
    title: 'Landlords',
    description: 'Portfolio health, rental growth and compliance snapshots.',
    permissions: [
      'View property KPIs and monthly rent roll',
      'Approve rent increases & renewals',
      'Download receipts and statements'
    ],
    accent: 'from-emerald-500/20 to-green-500/10',
    icon: Home
  },
  {
    title: 'Property Managers',
    description: 'Hands-on operations for payments, leases, and tenant care.',
    permissions: [
      'Log cash & bank payments, issue receipts instantly',
      'Send invoices or SMS reminders in kwacha (ZMW)',
      'Register tenants & capture lease renewals'
    ],
    accent: 'from-amber-500/20 to-orange-500/10',
    icon: Users
  },
  {
    title: 'Maintenance Crew',
    description: 'Mobile-friendly task board with SLA timers.',
    permissions: [
      'Accept repair tickets from managers or tenants',
      'Track parts, costs, and before/after photos',
      'Prioritise emergencies automatically'
    ],
    accent: 'from-rose-500/20 to-pink-500/10',
    icon: Wrench
  },
  {
    title: 'Tenants',
    description: 'Self-service portal built for WhatsApp-first Zambia.',
    permissions: [
      'Download invoices and receipts on mobile',
      'Submit maintenance with voice notes/photos',
      'Receive renewal notices & rent increase reminders'
    ],
    accent: 'from-indigo-500/20 to-purple-500/10',
    icon: MessageSquare
  }
];

const maintenanceQueue = [
  {
    property: 'Northmead Apartments',
    issue: 'Burst geyser in Unit 3B',
    priority: 'critical',
    assignedTo: 'Emmanuel (Plumber)',
    status: 'On site',
    reportedAt: '08:30 today'
  },
  {
    property: 'Ibex Hill Villas',
    issue: 'Garden lights not working',
    priority: 'medium',
    assignedTo: 'Loveness (Electrician)',
    status: 'Awaiting parts',
    reportedAt: 'Yesterday'
  },
  {
    property: 'Woodlands Duplex',
    issue: 'Tenant requested pest control',
    priority: 'low',
    assignedTo: 'Chanda (Ops)',
    status: 'Scheduled Friday',
    reportedAt: '2 days ago'
  }
];

const paymentLog = [
  {
    tenant: 'Kunda Mwansa',
    property: 'Roma Park House',
    amount: 'ZMW 18,500',
    method: 'Bank Transfer',
    status: 'Cleared',
    action: 'Receipt sent'
  },
  {
    tenant: 'Naledi Phiri',
    property: 'Mass Media Flats',
    amount: 'ZMW 9,200',
    method: 'Cash',
    status: 'Pending Approval',
    action: 'Awaiting manager'
  },
  {
    tenant: 'Chola Tembo',
    property: 'Lilayi Estates',
    amount: 'ZMW 12,000',
    method: 'Mobile Money',
    status: 'Reminder scheduled',
    action: 'SMS + Email'
  }
];

const leaseTracker = [
  {
    tenant: 'Tandiwe Zulu',
    property: 'Chamba Valley Loft',
    renewal: '30 Nov 2024',
    increase: 'Recommend +8%',
    notice: 'Reminder sent 90 days early'
  },
  {
    tenant: 'Faith Banda',
    property: 'Lake Road Offices',
    renewal: '15 Jan 2025',
    increase: 'Index to CPI (+11%)',
    notice: 'Draft letter ready'
  },
  {
    tenant: 'Mumba & Co.',
    property: 'Makeni Retail',
    renewal: '01 Mar 2025',
    increase: 'Hold (market review)',
    notice: 'Manager to confirm'
  }
];

export default function ZambiaRealEstateApp() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-600/10 p-2 text-blue-600">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Zambian PropTech</p>
              <p className="text-lg font-semibold">Nkwazi Property Console</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 text-sm font-medium text-slate-600 md:flex">
            <Link href="/auth/login" className="hover:text-slate-900">
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-full bg-slate-900 px-4 py-2 text-white shadow-sm hover:bg-slate-800"
            >
              Launch Console
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 space-y-12">
        <section className="grid gap-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <MapPin className="h-4 w-4" /> Built for Zambia · Lusaka HQ
            </span>
            <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
              Operate your rentals, facilities, and tenants from one mobile-first console.
            </h1>
            <p className="text-base text-slate-600 sm:text-lg">
              From Kalingalinga bedsits to Copperbelt malls, digitise payments, leases, maintenance, and tenant care with
              Next.js, MongoDB, and shadcn-powered interfaces.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
              >
                Start onboarding
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
              >
                Explore demo data
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              {[{
                label: 'Monthly rent processed',
                value: 'ZMW 4.2M',
                trend: '+12% vs last month'
              }, {
                label: 'Maintenance SLAs met',
                value: '94%',
                trend: 'Avg fix time 6h'
              }, {
                label: 'Automated reminders',
                value: '318',
                trend: 'Email · SMS · WhatsApp'
              }].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-100 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-emerald-600">{stat.trend}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-900/95 p-5 text-white">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Mobile Console</span>
              <Smartphone className="h-4 w-4" />
            </div>
            <p className="mt-4 text-lg font-semibold">Tap-friendly dashboard</p>
            <ul className="mt-6 space-y-4 text-sm">
              {[
                { icon: CreditCard, text: 'Log a payment, tag bank proof, and auto-issue PDF receipts.' },
                { icon: BellRing, text: 'Schedule rent reminders in batches: email, SMS, WhatsApp.' },
                { icon: ClipboardList, text: 'Track maintenance statuses with SLA timers and photos.' },
                { icon: CalendarCheck, text: 'Lease renewals flagged 90 days ahead with rent increase suggestions.' }
              ].map((item) => (
                <li key={item.text} className="flex gap-3">
                  <item.icon className="mt-1 h-4 w-4 text-emerald-400" />
                  <p className="text-slate-200">{item.text}</p>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl bg-slate-800/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Current focus</p>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-200">10 unpaid invoices</p>
                  <p className="text-xs text-slate-400">Due before 5th October</p>
                </div>
                <button className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20">
                  Send reminders
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Team access</p>
              <h2 className="text-2xl font-semibold">Give every stakeholder the right controls</h2>
            </div>
            <Link href="/users" className="hidden text-sm font-semibold text-blue-600 hover:underline md:inline-flex">
              Manage roles <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roleAccess.map(({ title, description, permissions, accent, icon: Icon }) => (
              <article
                key={title}
                className={`flex h-full flex-col rounded-3xl border border-slate-100 bg-gradient-to-br ${accent} p-5`}
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-white/60 p-2 text-slate-900">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                </div>
                <p className="mt-3 text-sm text-slate-600">{description}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {permissions.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Cashflow</p>
                <h3 className="text-xl font-semibold">Payments, receipts & reminders</h3>
              </div>
              <BadgeCheck className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Property</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentLog.map((payment) => (
                    <tr key={payment.tenant} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{payment.tenant}</td>
                      <td className="px-4 py-3 text-slate-500">{payment.property}</td>
                      <td className="px-4 py-3 text-slate-900">{payment.amount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                            payment.status === 'Cleared'
                              ? 'bg-emerald-50 text-emerald-700'
                              : payment.status === 'Pending Approval'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          <CreditCard className="h-3 w-3" />
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600">{payment.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1">
                <Receipt className="h-3 w-3" /> Instant PDF receipts
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1">
                <Mail className="h-3 w-3" /> Email & SMS reminders
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1">
                <Phone className="h-3 w-3" /> Airtel & MTN Mobile Money ready
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Maintenance cockpit</h3>
                <ClipboardList className="h-5 w-5 text-slate-500" />
              </div>
              <div className="mt-4 space-y-4">
                {maintenanceQueue.map((ticket) => (
                  <div key={ticket.property} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{ticket.property}</p>
                        <p className="text-sm text-slate-500">{ticket.issue}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          ticket.priority === 'critical'
                            ? 'bg-rose-50 text-rose-700'
                            : ticket.priority === 'medium'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3" /> {ticket.priority}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <UserCog className="h-3 w-3" /> {ticket.assignedTo}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock4 className="h-3 w-3" /> {ticket.reportedAt}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3 text-emerald-500" /> {ticket.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Lease tracker</h3>
                <CalendarCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="mt-4 space-y-4 text-sm">
                {leaseTracker.map((lease) => (
                  <div key={lease.tenant} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-base font-semibold">{lease.tenant}</p>
                    <p className="text-slate-300">{lease.property}</p>
                    <div className="mt-3 grid gap-3 text-xs text-slate-200 sm:grid-cols-3">
                      <span className="inline-flex items-center gap-1">
                        <CalendarCheck className="h-3 w-3" /> {lease.renewal}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> {lease.increase}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <BellRing className="h-3 w-3" /> {lease.notice}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.3em] text-slate-400">
                CPI + Market benchmarking baked in
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Operational flows</p>
              <h3 className="text-2xl font-semibold">End-to-end journeys for your team</h3>
              <p className="mt-2 text-sm text-slate-500">
                Each workflow lives on top of TanStack Query, React Table, and secure MongoDB collections so you can
                plug into existing processes without rework.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              {['Log Payment', 'Generate Invoice', 'Assign Technician', 'Approve Rent Increase'].map((label) => (
                <span key={label} className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-600">
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Payments & Receipts',
                icon: CreditCard,
                steps: ['Capture payment & proof', 'Approve & sync to ledger', 'Send receipt + reminder plan']
              },
              {
                title: 'Leases & Rent Increases',
                icon: FileText,
                steps: ['Monitor renewal timeline', 'Benchmark increase vs CPI', 'Issue notice & update rent']
              },
              {
                title: 'Maintenance Lifecycle',
                icon: Wrench,
                steps: ['Tenant/manager submits ticket', 'Prioritise & dispatch team', 'Track completion & cost']
              }
            ].map((flow) => (
              <article key={flow.title} className="rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center gap-3">
                  <flow.icon className="h-5 w-5 text-slate-500" />
                  <h4 className="font-semibold text-slate-900">{flow.title}</h4>
                </div>
                <ol className="mt-4 space-y-2 text-sm text-slate-600">
                  {flow.steps.map((step, idx) => (
                    <li key={step} className="flex gap-2">
                      <span className="mt-0.5 h-5 w-5 rounded-full bg-slate-900/5 text-center text-xs font-semibold leading-5 text-slate-900">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-slate-900">Ready to modernise Zambian property operations?</p>
            <p>Deploy the stack across landlords, managers, maintenance, and tenants with one secure login.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/register" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-white">
              Request onboarding deck <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="mailto:hello@nkwaziprop.com"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-slate-700"
            >
              hello@nkwaziprop.com
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
