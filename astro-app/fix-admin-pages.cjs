const fs = require('fs');

// Fix coaches.astro
fixAstroPage('src/pages/admin/coaches.astro', `
<MainLayout title="Admin Egitmen Yonetimi" activePage="admin-coaches">
  <AdminCoachesPanel
    client:load
    ok={ok}
    error={error}
    isSuperAdmin={isSuperAdmin(currentUser)}
    canManageSensitive={canManageSensitiveMutations}
    canManageCoachActivation={canManageCoachActivation}
    totalCoaches={totalCoaches}
    activeCoaches={activeCoaches}
    passiveCoaches={passiveCoaches}
    coachesWithStudents={coachesWithStudents}
    coaches={coaches.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      active: c.active,
      referralCode: c.referralCode,
      subscriptionStatus: c.subscriptionStatus,
      subscriptionEnd: c.subscriptionEnd ? c.subscriptionEnd.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
      studentCount: c._count.students,
    }))}
    coachDiscountById={coachDiscountById}
  />
</MainLayout>
`);

// Fix payments.astro
fixAstroPage('src/pages/admin/payments.astro', `
<MainLayout title="Admin Odemeler" activePage="admin-payments">
  <AdminPaymentsPanel
    client:load
    totalTransactions={totalTransactions}
    paidTransactions={paidTransactions}
    pendingTransactions={pendingTransactions}
    failedTransactions={failedTransactions}
    paymentSuccessRate={paymentSuccessRate}
    failedRate={failedRate}
    totalRevenue={totalRevenue}
    monthRevenue={monthRevenue}
    recentPaid={recentPaidTransactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount || 0),
      status: tx.status,
      paidAt: tx.paidAt ? tx.paidAt.toISOString() : null,
      failedAt: tx.failedAt ? tx.failedAt.toISOString() : null,
      createdAt: tx.createdAt.toISOString(),
      payerName: tx.payer?.name || null,
      payerEmail: tx.payer?.email || null,
      coachName: tx.coach?.name || null,
      studentName: tx.student?.name || null,
      packageName: tx.coachPackage?.name || null,
      failureReason: null,
    }))}
    recentPending={recentPendingTransactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount || 0),
      status: tx.status,
      paidAt: null,
      failedAt: null,
      createdAt: tx.createdAt.toISOString(),
      payerName: tx.payer?.name || null,
      payerEmail: tx.payer?.email || null,
      coachName: tx.coach?.name || null,
      studentName: tx.student?.name || null,
      packageName: tx.coachPackage?.name || null,
      failureReason: null,
    }))}
    recentFailed={recentFailedTransactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount || 0),
      status: tx.status,
      paidAt: null,
      failedAt: tx.failedAt ? tx.failedAt.toISOString() : null,
      createdAt: tx.createdAt.toISOString(),
      payerName: tx.payer?.name || null,
      payerEmail: tx.payer?.email || null,
      coachName: tx.coach?.name || null,
      studentName: tx.student?.name || null,
      packageName: tx.coachPackage?.name || null,
      failureReason: extractFailureReason(tx.metadata),
    }))}
    topFailureReasons={topFailureReasons.map(([reason, count]) => ({ reason, count }))}
  />
</MainLayout>
`);

// Fix pricing.astro
fixAstroPage('src/pages/admin/pricing.astro', `
<MainLayout title="Admin Fiyatlandirma" activePage="admin-pricing">
  <AdminPricingPanel
    client:load
    ok={ok}
    error={error}
    isSuperAdmin={isSuperAdmin(adminUser)}
    canManagePricing={canManagePricing}
    monthlyPlanPrice={monthlyPlan?.price || 299}
    monthlyPlanLabel={monthlyPlan?.label || 'Aylik Plan'}
    yearlyPlanPrice={yearlyPlan?.price || 2990}
    yearlyPlanLabel={yearlyPlan?.label || 'Yillik Plan'}
    globalDiscount={{ enabled: globalCoachDiscount.enabled, amount: globalCoachDiscount.amount }}
    monthlyPlanDiscount={{ enabled: coachPlanDiscounts.monthly.enabled, amount: coachPlanDiscounts.monthly.amount }}
    yearlyPlanDiscount={{ enabled: coachPlanDiscounts.yearly.enabled, amount: coachPlanDiscounts.yearly.amount }}
  />
</MainLayout>
`);

// Fix security.astro
fixAstroPage('src/pages/admin/security.astro', `
<MainLayout title="Admin Guvenlik" activePage="admin-security">
  <AdminSecurityPanel
    client:load
    isSuperAdmin={userIsSuperAdmin}
    canManageSecurity={userCanManageAdminSecurity}
    infoMessage={infoMessage}
    errorMessage={errorMessage}
    generatedInviteLink={generatedInviteLink}
    generatedInviteEmail={generatedInviteEmail}
    backofficeUsers={backofficeUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt.toISOString(),
    }))}
    pendingInvites={pendingInvitesList.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: String(inv.role || 'admin'),
      invitedByUserId: inv.invitedByUserId,
      invitedByEmail: inv.invitedByEmail || null,
      acceptedByUserId: inv.acceptedByUserId || null,
      acceptedAt: inv.acceptedAt ? new Date(inv.acceptedAt).toISOString() : null,
      expiresAt: new Date(inv.expiresAt).toISOString(),
      createdAt: new Date(inv.createdAt).toISOString(),
    }))}
    acceptedInvites={acceptedInvitesList.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: String(inv.role || 'admin'),
      invitedByUserId: inv.invitedByUserId,
      invitedByEmail: inv.invitedByEmail || null,
      acceptedByUserId: inv.acceptedByUserId || null,
      acceptedAt: inv.acceptedAt ? new Date(inv.acceptedAt).toISOString() : null,
      expiresAt: new Date(inv.expiresAt).toISOString(),
      createdAt: new Date(inv.createdAt).toISOString(),
    }))}
    defaultTtlHours={getAdminInviteTtlHours()}
  />
</MainLayout>
`);

function fixAstroPage(filePath, template) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Find second occurrence of ---
  const firstIdx = content.indexOf('---');
  const secondIdx = content.indexOf('---', firstIdx + 3);
  if (secondIdx === -1) {
    console.error('Could not find closing --- in', filePath);
    return;
  }
  const frontmatter = content.substring(0, secondIdx + 3);
  fs.writeFileSync(filePath, frontmatter + template);
  console.log('Fixed:', filePath);
}
