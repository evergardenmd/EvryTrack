import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { generateMonthlyStatement, generateAnnualRollup, calculateTipAnalytics } from '../utils/statementEngine';
import { formatCurrency, convertTimeToDecimal } from '../utils/prop22Engine';

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SparklesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83" strokeLinecap="round" />
  </svg>
);

/**
 * Pure jsPDF Document Exporter
 * Directly generates and downloads formatted PDF statements in < 10ms with complete monthly or annual breakdowns.
 */
function downloadDirectPDF({ statement, annualRollup, statementMode, monthLabel, settings }) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const isMonthly = statementMode === 'monthly';
  const filename = isMonthly
    ? `EvryTrack_Statement_${monthLabel.replace(/\s+/g, '_')}.pdf`
    : `EvryTrack_2026_Annual_Tax_Rollup.pdf`;

  const primaryColor = [16, 185, 129]; // Emerald #10b981
  const darkText = [17, 24, 39];      // Charcoal #111827
  const graySub = [107, 114, 128];     // Gray #6b7280
  const lightBg = [243, 244, 246];     // Light Gray #f3f4f6

  // Header Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.text('EvryTrack', 40, 50);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  const badgeText = isMonthly ? 'MONTHLY FINANCIAL STATEMENT' : 'ANNUAL TAX & INCOME ROLLUP';
  doc.text(badgeText, 160, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...graySub);
  doc.text(`Issued: ${isMonthly ? statement.generatedAt : annualRollup.generatedAt} | Period: ${isMonthly ? monthLabel : 'Full Year 2026'}`, 40, 68);

  // Account Profile Right Side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...graySub);
  doc.text('ACCOUNT PROFILE', 430, 38);
  doc.setFontSize(10);
  doc.setTextColor(...darkText);
  const userNameStr = settings?.userName?.trim() ? settings.userName.trim() : '';
  const workTypeStr = settings?.workType === 'both' ? 'W-2 & Gig Worker' : settings?.workType === 'gig_only' ? 'Gig Worker Only' : 'W-2 Worker Only';
  if (userNameStr) {
    doc.text(userNameStr, 430, 50);
    doc.setFontSize(8.5);
    doc.setTextColor(...graySub);
    doc.text(`${workTypeStr} | ID: ${isMonthly ? statement.statementId : annualRollup.statementId}`, 430, 64);
  } else {
    doc.text(workTypeStr, 430, 52);
    doc.setFontSize(8.5);
    doc.setTextColor(...graySub);
    doc.text(`ID: ${isMonthly ? statement.statementId : annualRollup.statementId}`, 430, 66);
  }

  // Separator Line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(1);
  doc.line(40, 82, 572, 82);

  let y = 105;

  if (isMonthly) {
    // 3 Summary Cards
    const boxWidth = 168;
    const boxHeight = 65;

    // Card 1: Grand Total
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(40, y, boxWidth, boxHeight, 8, 8, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...graySub);
    doc.text('Grand Total Income', 52, y + 18);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`$${statement.grandTotalIncome.toFixed(2)}`, 52, y + 40);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...graySub);
    doc.text('Net earnings across all sources', 52, y + 55);

    // Card 2: W-2 Salary
    doc.setFillColor(...lightBg);
    doc.roundedRect(222, y, boxWidth, boxHeight, 8, 8, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...graySub);
    doc.text('W-2 Salary Income', 234, y + 18);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`$${statement.totalW2Income.toFixed(2)}`, 234, y + 40);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...graySub);
    doc.text(`${statement.payFrequency.toUpperCase()} Payouts`, 234, y + 55);

    // Card 3: Gig Income
    doc.setFillColor(...lightBg);
    doc.roundedRect(404, y, boxWidth, boxHeight, 8, 8, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...graySub);
    doc.text('Gig Work Income', 416, y + 18);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`$${statement.tipAnalytics.totalGigEarnings.toFixed(2)}`, 416, y + 40);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...primaryColor);
    doc.text('Base + Tips + Top-Up', 416, y + 55);

    y += 90;

    // Section 1: W-2 Deposits
    if (settings?.workType !== 'gig_only') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text('1. W-2 Salary Payroll Deposits', 40, y);
      doc.setFontSize(9);
      doc.setTextColor(...graySub);
      doc.text(`Total: $${statement.totalW2Income.toFixed(2)}`, 470, y);

      y += 15;
      if (statement.w2Paychecks.length > 0) {
        doc.setFillColor(243, 244, 246);
        doc.rect(40, y, 532, 20, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkText);
        doc.text('Paycheck Payout', 50, y + 14);
        doc.text('Schedule Date', 260, y + 14);
        doc.text('Deposit Amount', 470, y + 14);

        y += 20;
        statement.w2Paychecks.forEach(chk => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(...darkText);
          doc.text(chk.title, 50, y + 15);
          doc.text(chk.dateLabel, 260, y + 15);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...primaryColor);
          doc.text(`$${chk.amount.toFixed(2)}`, 470, y + 15);
          doc.setDrawColor(243, 244, 246);
          doc.line(40, y + 22, 572, y + 22);
          y += 24;
        });
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(...graySub);
        doc.text('No W-2 fixed salary configured ($0.00).', 50, y + 15);
        y += 25;
      }
    }

    y += 15;

    // Section 2: Gig Tip Analytics
    if (settings?.workType !== 'w2_only') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text('2. Gig Tip Ratio & Earnings Analytics', 40, y);

      y += 18;
      const cardW = 124;
      const cardH = 50;

      // Card 1: Gig Tips
      doc.setFillColor(...lightBg);
      doc.roundedRect(40, y, cardW, cardH, 6, 6, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...graySub);
      doc.text('Gig Tips', 48, y + 14);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(`$${statement.tipAnalytics.totalTips.toFixed(2)}`, 48, y + 32);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...graySub);
      doc.text(`${statement.tipAnalytics.tipRatio}% of total pay`, 48, y + 43);

      // Card 2: Avg Pay / Hr
      doc.setFillColor(...lightBg);
      doc.roundedRect(176, y, cardW, cardH, 6, 6, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...graySub);
      doc.text('Avg Pay / Hr', 184, y + 14);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkText);
      doc.text(`$${statement.tipAnalytics.totalGigPerHour.toFixed(2)}/h`, 184, y + 32);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...graySub);
      doc.text(`incl. $${statement.tipAnalytics.tipPerHour.toFixed(2)}/h tips`, 184, y + 43);

      // Card 3: Base Pay
      doc.setFillColor(...lightBg);
      doc.roundedRect(312, y, cardW, cardH, 6, 6, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...graySub);
      doc.text('Base Pay', 320, y + 14);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkText);
      doc.text(`$${statement.tipAnalytics.totalBase.toFixed(2)}`, 320, y + 32);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...graySub);
      doc.text(`${statement.tipAnalytics.baseRatio}% of total pay`, 320, y + 43);

      // Card 4: Top-Up
      doc.setFillColor(...lightBg);
      doc.roundedRect(448, y, cardW, cardH, 6, 6, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...graySub);
      doc.text('Top-Up', 456, y + 14);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text(`$${statement.tipAnalytics.totalTopUp.toFixed(2)}`, 456, y + 32);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...graySub);
      doc.text(`${statement.tipAnalytics.topUpRatio}% of total pay`, 456, y + 43);

      y += 65;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...graySub);
      doc.text(`Income Distribution Breakdown:  Base ${statement.tipAnalytics.baseRatio}%  •  Tips ${statement.tipAnalytics.tipRatio}%  •  Top-Up ${statement.tipAnalytics.topUpRatio}% ${statement.tipAnalytics.totalShopperBumps > 0 ? ` •  Bumps ${statement.tipAnalytics.bumpRatio}%` : ''}`, 40, y);
      y += 25;
    }

    // Bank Deposit Reconciliation Audit Box in PDF
    if (statement.depositSummary?.hasDeposits) {
      if (y > 620) {
        doc.addPage();
        y = 40;
      }

      doc.setFillColor(243, 244, 246);
      doc.roundedRect(40, y, 532, 48, 6, 6, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...primaryColor);
      doc.text('Bank Deposit Reconciliation Audit Summary', 50, y + 15);

      const combVar = statement.combinedDepositSummary?.totalCombinedVariance || 0;
      const varText = combVar === 0
        ? '100% Fully Reconciled ($0.00 Variance)'
        : combVar > 0
          ? `+$${combVar.toFixed(2)} Net Overpay / Bonus`
          : `-$${Math.abs(combVar).toFixed(2)} Net Discrepancy`;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(combVar >= 0 ? 16 : 217, combVar >= 0 ? 185 : 119, combVar >= 0 ? 129 : 6);
      doc.text(`Status: ${varText}`, 320, y + 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...darkText);

      if (settings?.workType !== 'w2_only') {
        doc.text(`Gig Bank Payouts: $${statement.depositSummary.totalBankDeposits.toFixed(2)} | App Tracked Total: $${statement.depositSummary.totalTrackedEarnings.toFixed(2)} (Includes: Shift Pay $${statement.depositSummary.totalTrackedWorked.toFixed(2)} + Bumps $${statement.depositSummary.totalShopperBumps.toFixed(2)})`, 50, y + 28);
      }
      if (settings?.workType !== 'gig_only') {
        doc.text(`W-2 Salary Paycheck: $${statement.w2DepositSummary.actualW2Deposited.toFixed(2)} (Configured Base Salary: $${statement.w2DepositSummary.expectedW2Salary.toFixed(2)})`, 50, y + 40);
      }

      y += 56;
    }

    // Section 3: Itemized Weekly & Daily Shift Breakdown Ledger
    // Section 3: Itemized Weekly & Daily Shift Breakdown Ledger (PDF Export)
    if (settings?.workType !== 'w2_only' && statement.groupedWeeks?.length > 0) {
      if (y > 640) {
        doc.addPage();
        y = 40;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text('3. Itemized Weekly & Daily Shift Ledger', 40, y);

      y += 18;

      statement.groupedWeeks.forEach((week) => {
        if (y > 640) {
          doc.addPage();
          y = 40;
        }

        // Week Header Bar
        doc.setFillColor(243, 244, 246);
        doc.rect(40, y, 532, 22, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(...primaryColor);
        doc.text(week.label, 48, y + 14);

        y += 32;

        const hasShopperBumps = statement.depositSummary?.totalShopperBumps > 0 || week.shopperBump > 0;

        // Table Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...graySub);
        doc.text('Date', 44, y);
        doc.text('Active Shift', 145, y);
        doc.text('(Base Pay)', 250, y, { align: 'right' });
        doc.text('(Top-Up)', 330, y, { align: 'right' });
        doc.text('Tips', 410, y, { align: 'right' });
        if (hasShopperBumps) doc.text('Bump', 480, y, { align: 'right' });
        doc.text('Total Pay', 565, y, { align: 'right' });

        y += 6;
        doc.setDrawColor(229, 231, 235);
        doc.line(40, y, 572, y);
        y += 14;

        week.entries.forEach((entry) => {
          if (y > 700) {
            doc.addPage();
            y = 40;
          }

          const dateStr = new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const hrsNum = (entry.activeTimeH !== undefined || entry.activeTimeM !== undefined || entry.activeTimeS !== undefined)
            ? convertTimeToDecimal(entry.activeTimeH, entry.activeTimeM, entry.activeTimeS)
            : (parseFloat(entry.activeHours) || 0);

          const baseAmt = parseFloat(entry.basePay) || 0;
          const tipAmt = parseFloat(entry.tips) || 0;
          const topUpAmt = (!entry.isOutsideMonth && entry.calc?.adjustmentTopUp > 0) ? entry.calc.adjustmentTopUp : 0;
          const bumpAmt = parseFloat(entry.shopperBump || entry.bump) || 0;
          const totalShiftPay = entry.calc?.totalShiftEarnings || 0;

          // Date (Col 1)
          if (entry.isOutsideMonth) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text(`${dateStr} (Outside)`, 44, y);
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(...darkText);
            doc.text(dateStr, 44, y);
          }

          // Active Shift (Col 2)
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(...graySub);
          const shiftMetricsStr = settings.includeMiles ? `${hrsNum.toFixed(2)}h  •  ${entry.activeMiles || 0}mi` : `${hrsNum.toFixed(2)}h`;
          doc.text(shiftMetricsStr, 145, y);

          // (Base Pay) (Col 3 - Right Aligned)
          doc.text(`($${baseAmt.toFixed(2)})`, 250, y, { align: 'right' });

          // (Top-Up) (Col 4 - Right Aligned)
          if (topUpAmt > 0) {
            doc.setTextColor(217, 119, 6);
            doc.text(`(+$${topUpAmt.toFixed(2)})`, 330, y, { align: 'right' });
          } else {
            doc.setTextColor(...graySub);
            doc.text('($0.00)', 330, y, { align: 'right' });
          }

          // Tips (Col 5 - Right Aligned)
          if (entry.isOutsideMonth) {
            doc.setTextColor(156, 163, 175);
          } else {
            doc.setTextColor(16, 185, 129);
          }
          doc.text(`$${tipAmt.toFixed(2)}`, 410, y, { align: 'right' });

          // Bump (Col 6 - Right Aligned if bumps exist)
          if (hasShopperBumps) {
            if (bumpAmt > 0) {
              doc.setTextColor(217, 119, 6);
              doc.text(`+$${bumpAmt.toFixed(2)}`, 480, y, { align: 'right' });
            } else {
              doc.setTextColor(...graySub);
              doc.text('-', 480, y, { align: 'right' });
            }
          }

          // Total Pay (Col 7 - Right Aligned)
          if (entry.isOutsideMonth) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(156, 163, 175);
          } else {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...primaryColor);
          }
          doc.text(`$${totalShiftPay.toFixed(2)}`, 565, y, { align: 'right' });

          y += 16;
        });

        // Week Totals Row in PDF
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...primaryColor);
        doc.text('Week Totals', 44, y);
        doc.setTextColor(...darkText);
        doc.text(`${week.totalHours.toFixed(2)}h  •  ${week.totalMiles}mi`, 145, y);
        doc.setTextColor(...graySub);
        doc.text(`($${week.totalBase.toFixed(2)})`, 250, y, { align: 'right' });
        doc.setTextColor(217, 119, 6);
        doc.text(week.totalTopUp > 0 ? `(+$${week.totalTopUp.toFixed(2)})` : '($0.00)', 330, y, { align: 'right' });
        doc.setTextColor(16, 185, 129);
        doc.text(`$${week.totalTips.toFixed(2)}`, 410, y, { align: 'right' });
        if (hasShopperBumps) {
          doc.setTextColor(217, 119, 6);
          doc.text(week.shopperBump > 0 ? `+$${week.shopperBump.toFixed(2)}` : '-', 480, y, { align: 'right' });
        }
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(`$${week.totalEarnings.toFixed(2)}`, 565, y, { align: 'right' });

        y += 22;
      });
    }
  } else {
  // ──────── ANNUAL STATEMENT PDF EXPORT ────────
  const boxWidth = 168;
  const boxHeight = 65;

  // Card 1: Annual Gross Income
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(40, y, boxWidth, boxHeight, 8, 8, 'F');
  doc.setFontSize(9);
  doc.setTextColor(...graySub);
  doc.text('2026 Annual Gross Income', 52, y + 18);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(`$${annualRollup.grandTotalAnnual.toFixed(2)}`, 52, y + 40);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...graySub);
  doc.text('W-2 + Gig + Tips + Top-Ups', 52, y + 55);

  // Card 2: Annual W-2 Salary
  doc.setFillColor(...lightBg);
  doc.roundedRect(222, y, boxWidth, boxHeight, 8, 8, 'F');
  doc.setFontSize(9);
  doc.setTextColor(...graySub);
  doc.text('Annual W-2 Salary', 234, y + 18);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkText);
  doc.text(`$${annualRollup.totalAnnualW2.toFixed(2)}`, 234, y + 40);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...graySub);
  doc.text('Accumulated Monthly W-2', 234, y + 55);

  // Card 3: Annual Gig Earnings
  doc.setFillColor(...lightBg);
  doc.roundedRect(404, y, boxWidth, boxHeight, 8, 8, 'F');
  doc.setFontSize(9);
  doc.setTextColor(...graySub);
  doc.text('Annual Gig Earnings', 416, y + 18);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(`$${annualRollup.totalGigAllYear.toFixed(2)}`, 416, y + 40);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...graySub);
  doc.text('Base + Tips + Top-Up', 416, y + 55);

  y += 80;

  // Annual Tip Ratio Analytics & Distribution
  if (settings?.workType !== 'w2_only') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('1. Annual Tip Ratio & Earnings Analytics', 40, y);

    y += 18;
    const cardW = 124;
    const cardH = 50;

    // Card 1: Annual Gig Tips
    doc.setFillColor(...lightBg);
    doc.roundedRect(40, y, cardW, cardH, 6, 6, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...graySub);
    doc.text('Annual Gig Tips', 48, y + 14);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`$${annualRollup.totalTipsAllYear.toFixed(2)}`, 48, y + 32);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...graySub);
    doc.text(`${annualRollup.tipRatio}% of gig pay`, 48, y + 43);

    // Card 2: Avg Pay / Hr
    doc.setFillColor(...lightBg);
    doc.roundedRect(176, y, cardW, cardH, 6, 6, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...graySub);
    doc.text('Avg Pay / Hr', 184, y + 14);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`$${annualRollup.gigPerHour.toFixed(2)}/h`, 184, y + 32);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...graySub);
    doc.text(`incl. $${annualRollup.tipPerHour.toFixed(2)}/h tips`, 184, y + 43);

    // Card 3: Base Pay
    doc.setFillColor(...lightBg);
    doc.roundedRect(312, y, cardW, cardH, 6, 6, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...graySub);
    doc.text('Base Pay', 320, y + 14);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text(`$${annualRollup.totalBaseAllYear.toFixed(2)}`, 320, y + 32);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...graySub);
    doc.text(`${annualRollup.baseRatio}% of gig pay`, 320, y + 43);

    // Card 4: Top-Up
    doc.setFillColor(...lightBg);
    doc.roundedRect(448, y, cardW, cardH, 6, 6, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...graySub);
    doc.text('Top-Up', 456, y + 14);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 119, 6);
    doc.text(`$${annualRollup.totalTopUpAllYear.toFixed(2)}`, 456, y + 32);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...graySub);
    doc.text(`${annualRollup.topUpRatio}% of gig pay`, 456, y + 43);

    y += 65;

    // Section 3: 12-Month Monthly Gig Performance Breakdown Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('3. 12-Month Monthly Gig Performance Breakdown (2026)', 40, y);

    y += 18;
    doc.setFillColor(243, 244, 246);
    doc.rect(40, y, 532, 20, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkText);
    doc.text('Month', 48, y + 14);
    doc.text('Active Hrs', 115, y + 14);
    doc.text('Miles', 170, y + 14);
    doc.text('Base Pay', 230, y + 14);
    doc.text('Top-Up', 300, y + 14);
    doc.text('Gig Tips', 390, y + 14);
    doc.text('$/Hr Rate', 455, y + 14);
    doc.text('Total Gig Pay', 510, y + 14);

    y += 20;

    annualRollup.monthlyRows.forEach(row => {
      if (y > 710) {
        doc.addPage();
        y = 40;
      }

      doc.setFont('helvetica', row.hasData ? 'bold' : 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(row.hasData ? darkText[0] : graySub[0], row.hasData ? darkText[1] : graySub[1], row.hasData ? darkText[2] : graySub[2]);
      doc.text(row.monthName, 48, y + 13);
      doc.setFont('helvetica', 'normal');
      doc.text(`${row.hours}h`, 115, y + 13);
      doc.text(`${row.miles}mi`, 170, y + 13);
      doc.text(`$${row.basePay.toFixed(2)}`, 230, y + 13);
      doc.setTextColor(row.hasData ? 217 : graySub[0], row.hasData ? 119 : graySub[1], row.hasData ? 6 : graySub[2]);
      doc.text(`+$${row.topUp.toFixed(2)}`, 300, y + 13);
      doc.setTextColor(row.hasData ? 16 : graySub[0], row.hasData ? 185 : graySub[1], row.hasData ? 129 : graySub[2]);
      doc.text(`$${row.tips.toFixed(2)}`, 390, y + 13);
      doc.setTextColor(row.hasData ? primaryColor[0] : graySub[0], row.hasData ? primaryColor[1] : graySub[1], row.hasData ? primaryColor[2] : graySub[2]);
      doc.text(`$${row.effectiveRate.toFixed(2)}/h`, 455, y + 13);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${row.gigTotal.toFixed(2)}`, 510, y + 13);

      doc.setDrawColor(243, 244, 246);
      doc.line(40, y + 18, 572, y + 18);
      y += 20;
    });

    // Full Year Totals Summary Row in PDF
    doc.setFillColor(236, 253, 245);
    doc.rect(40, y, 532, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.text('Full Year Totals', 48, y + 14);
    doc.text(`${annualRollup.totalHoursAllYear.toFixed(2)}h`, 115, y + 14);
    doc.text(`${annualRollup.totalMiles}mi`, 170, y + 14);
    doc.text(`$${annualRollup.totalBaseAllYear.toFixed(2)}`, 230, y + 14);
    doc.setTextColor(217, 119, 6);
    doc.text(`+$${annualRollup.totalTopUpAllYear.toFixed(2)}`, 300, y + 14);
    doc.setTextColor(16, 185, 129);
    doc.text(`$${annualRollup.totalTipsAllYear.toFixed(2)}`, 390, y + 14);
    doc.setTextColor(...primaryColor);
    doc.text(`$${annualRollup.gigPerHour.toFixed(2)}/h`, 455, y + 14);
    doc.setFontSize(8.5);
    doc.text(`$${annualRollup.totalGigAllYear.toFixed(2)}`, 510, y + 14);
    y += 24;
  }
}

  // Legal Disclaimer Box at bottom of PDF
  const pdfDisclaimer = doc.splitTextToSize(
    "This statement is generated by EvryTrack as a personal earnings record based on user-entered shift data and local guarantee calculations. EvryTrack is an independent software application and is not an employer, financial institution, or payroll processor. This document is provided solely for personal accounting and preliminary tax preparation assistance. It does not constitute an official employer paystub or legal proof of income for loan applications. Please consult a certified tax professional or CPA for official filings.",
    500
  );
  
  const disclaimerBoxHeight = 28 + (pdfDisclaimer.length * 11);

  if (y + disclaimerBoxHeight > 730) {
    doc.addPage();
    y = 40;
  } else {
    y += 15;
  }

  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(40, y, 532, disclaimerBoxHeight, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 83, 9);
  doc.text('NOTICE & LEGAL DISCLAIMER', 52, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(115, 60, 8);
  doc.text(pdfDisclaimer, 52, y + 28);

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...graySub);
  doc.text('EvryTrack Automated Financial Statement • Personal Record', 180, 765);

  // Save PDF directly to Downloads folder
  doc.save(filename);
}

export default function MonthlyStatementModal({ isOpen, onClose, entriesArray = [], settings = {}, monthLabel = 'Current Month' }) {
  const [statementMode, setStatementMode] = useState('monthly');
  const [forecastHours, setForecastHours] = useState(17);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const monthlyStatement = generateMonthlyStatement(entriesArray, settings, monthLabel);
  const annualRollup = generateAnnualRollup(entriesArray, settings, 2026);

  const { tipAnalytics } = monthlyStatement;

  const estimatedTips = tipAnalytics.forecastTips(forecastHours);
  const estimatedTotalGig = tipAnalytics.forecastTotalGig(forecastHours);

  const handleDownloadPDF = () => {
    setIsDownloading(true);
    try {
      downloadDirectPDF({
        statement: monthlyStatement,
        annualRollup,
        statementMode,
        monthLabel,
        settings,
      });
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const workTypeLabel = settings.workType === 'both' ? 'W-2 & Gig Worker'
    : settings.workType === 'gig_only' ? 'Gig Worker Only'
      : 'W-2 Worker Only';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          background: 'var(--card-bg)',
          borderColor: 'var(--card-border)',
        }}
      >
        {/* Header Controls */}
        <div
          className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b shrink-0 select-none print:hidden"
          style={{ borderColor: 'var(--card-border)', background: 'var(--drum-bg)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: 'var(--accent1)', color: 'var(--btn-text)' }}>
              📄
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>
                {statementMode === 'monthly' ? 'EvryTrack Monthly Statement' : 'EvryTrack 2026 Annual Tax Rollup'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-sub)' }}>
                {settings?.userName?.trim() ? `${settings.userName.trim()} • ` : ''}
                {statementMode === 'monthly' ? `${monthLabel} • Statement #${monthlyStatement.statementId}` : `Full Year 2026 • ID #${annualRollup.statementId}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center p-1 rounded-xl border" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
              <button
                type="button"
                onClick={() => setStatementMode('monthly')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                style={{
                  background: statementMode === 'monthly' ? 'var(--btn-bg)' : 'transparent',
                  color: statementMode === 'monthly' ? 'var(--btn-text)' : 'var(--text-sub)',
                }}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setStatementMode('annual')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                style={{
                  background: statementMode === 'annual' ? 'var(--btn-bg)' : 'transparent',
                  color: statementMode === 'annual' ? 'var(--btn-text)' : 'var(--text-sub)',
                }}
              >
                2026 Annual
              </button>
            </div>

            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className={`btn-primary text-xs py-1.5 px-3 gap-1.5 cursor-pointer shadow-md ${isDownloading ? 'opacity-60 cursor-wait' : ''}`}
              title="Download clean formatted PDF statement file directly"
            >
              <span>📥</span>
              <span className="font-bold">{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border hover:bg-white/10 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-sub)' }}
              title="Close Statement"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Printable Statement Document Body */}
        <div id="evrytrack-printable-statement" className="p-5 sm:p-8 overflow-y-auto space-y-6 text-left font-sans print:p-0 print:overflow-visible">
          {/* Statement Letterhead */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black text-xl tracking-tight" style={{ color: 'var(--accent1)' }}>
                  EvryTrack
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md" style={{ background: 'var(--drum-bg)', color: 'var(--accent1)', border: '1px solid var(--card-border)' }}>
                  {statementMode === 'monthly' ? 'MONTHLY FINANCIAL STATEMENT' : 'ANNUAL TAX & INCOME ROLLUP'}
                </span>
              </div>
              <p className="text-xs font-mono" style={{ color: 'var(--text-sub)' }}>
                Issued: {statementMode === 'monthly' ? monthlyStatement.generatedAt : annualRollup.generatedAt} | Period: {statementMode === 'monthly' ? monthLabel : 'Full Year 2026'}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-sub)' }}>Account Profile</p>
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{workTypeLabel}</p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-sub)' }}>
                ID: {statementMode === 'monthly' ? monthlyStatement.statementId : annualRollup.statementId}
              </p>
            </div>
          </div>

          {/* ──────── MONTHLY STATEMENT MODE ──────── */}
          {statementMode === 'monthly' && (
            <>
              {/* Executive Financial Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl border" style={{ background: 'var(--drum-bg)', borderColor: 'var(--accent1)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>Grand Total Income</p>
                  <p className="font-mono font-bold text-2xl" style={{ color: 'var(--accent1)' }}>
                    {formatCurrency(monthlyStatement.grandTotalIncome)}
                  </p>
                  <p className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--text-sub)' }}>Net earnings across all sources</p>
                </div>

                {settings.workType !== 'gig_only' && (
                  <div className="p-4 rounded-2xl border" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>W-2 Salary Income</p>
                    <p className="font-mono font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(monthlyStatement.totalW2Income)}
                    </p>
                    <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--text-sub)' }}>{monthlyStatement.payFrequency.toUpperCase()} Payouts</p>
                  </div>
                )}

                {settings.workType !== 'w2_only' && (
                  <div className="p-4 rounded-2xl border" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>Gig Work Income</p>
                    <p className="font-mono font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(tipAnalytics.totalGigEarnings)}
                    </p>
                    <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--accent2)' }}>
                      Base + Tips + Top-Up
                    </p>
                  </div>
                )}
              </div>

              {/* SECTION 1: W-2 Salary Ledger */}
              {settings.workType !== 'gig_only' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="label-text text-sm font-bold" style={{ color: 'var(--accent2)' }}>
                      1. W-2 Salary Payroll Deposits
                    </h3>
                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-sub)' }}>
                      Total: {formatCurrency(monthlyStatement.totalW2Income)}
                    </span>
                  </div>

                  {monthlyStatement.w2Paychecks.length > 0 ? (
                    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--card-border)', background: 'var(--drum-bg)' }}>
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ color: 'var(--text-sub)', borderBottom: '1px solid var(--card-border)' }}>
                            <th className="text-left py-2.5 px-4 font-semibold">Paycheck Payout</th>
                            <th className="text-left py-2.5 px-4 font-semibold">Schedule Date</th>
                            <th className="text-right py-2.5 px-4 font-semibold">Deposit Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyStatement.w2Paychecks.map(chk => (
                            <tr key={chk.id} className="border-b last:border-0" style={{ borderColor: 'var(--card-border)' }}>
                              <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                                {chk.title}
                              </td>
                              <td className="py-3 px-4 font-mono" style={{ color: 'var(--text-sub)' }}>
                                {chk.dateLabel}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold" style={{ color: 'var(--accent1)' }}>
                                {formatCurrency(chk.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs italic p-3 rounded-xl border" style={{ borderColor: 'var(--card-border)', color: 'var(--text-sub)', background: 'var(--drum-bg)' }}>
                      No W-2 fixed salary configured ($0.00).
                    </p>
                  )}
                </div>
              )}

              {/* SECTION 2: Tip Ratio Analytics & Predictive Estimator */}
              {settings.workType !== 'w2_only' && (
                <div className="space-y-3">
                  <h3 className="label-text text-sm font-bold" style={{ color: 'var(--accent2)' }}>
                    2. Gig Tip Ratio & Earnings Analytics
                  </h3>

                  <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                    <div className={`grid grid-cols-2 ${(monthlyStatement.depositSummary.totalShopperBumps > 0 || tipAnalytics.totalShopperBumps > 0) ? 'sm:grid-cols-5 gap-2' : 'sm:grid-cols-4 gap-3'}`}>
                      <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                        <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text-sub)' }}>Gig Tips</p>
                        <p className="font-mono font-bold text-sm sm:text-base" style={{ color: 'var(--accent2)' }}>
                          {formatCurrency(tipAnalytics.totalTips)}
                        </p>
                        <p className="text-[10px] font-mono leading-tight mt-1" style={{ color: 'var(--accent2)' }}>{tipAnalytics.tipRatio}% of total pay</p>
                      </div>

                      <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                        <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text-sub)' }}>Avg Pay / Hr</p>
                        <p className="font-mono font-bold text-xs sm:text-sm tracking-tight" style={{ color: 'var(--accent1)' }}>
                          ${tipAnalytics.totalGigPerHour.toFixed(2)}/hr
                        </p>
                        <p className="text-[10px] font-mono leading-tight mt-1" style={{ color: 'var(--text-sub)' }}>incl. ${tipAnalytics.tipPerHour.toFixed(2)}/hr tips</p>
                      </div>

                      <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                        <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text-sub)' }}>Base Pay</p>
                        <p className="font-mono font-bold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                          {formatCurrency(tipAnalytics.totalBase)}
                        </p>
                        <p className="text-[10px] leading-tight mt-1" style={{ color: 'var(--text-sub)' }}>{tipAnalytics.baseRatio}% of total pay</p>
                      </div>

                      <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                        <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text-sub)' }}>Top-Ups</p>
                        <p className="font-mono font-bold text-sm sm:text-base text-amber-400">
                          {formatCurrency(tipAnalytics.totalTopUp)}
                        </p>
                        <p className="text-[10px] leading-tight mt-1" style={{ color: 'var(--text-sub)' }}>{tipAnalytics.topUpRatio}% of total pay</p>
                      </div>

                      {(monthlyStatement.depositSummary.totalShopperBumps > 0 || tipAnalytics.totalShopperBumps > 0) && (
                        <div className="p-3 rounded-xl border col-span-2 sm:col-span-1 flex flex-col justify-between" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                          <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text-sub)' }}>Shopper Bumps</p>
                          <p className="font-mono font-bold text-sm sm:text-base text-amber-400">
                            {formatCurrency(monthlyStatement.depositSummary.totalShopperBumps || tipAnalytics.totalShopperBumps)}
                          </p>
                          <p className="text-[10px] leading-tight mt-1" style={{ color: 'var(--text-sub)' }}>incident / bonus pay</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5" style={{ color: 'var(--text-sub)' }}>
                        <span>Income Distribution Scope</span>
                        <span>Base {tipAnalytics.baseRatio}% • Tips {tipAnalytics.tipRatio}% • Top-Up {tipAnalytics.topUpRatio}% {tipAnalytics.totalShopperBumps > 0 ? `• Bump ${tipAnalytics.bumpRatio}%` : ''}</span>
                      </div>
                      <div className="w-full h-3 rounded-full overflow-hidden flex" style={{ background: 'var(--drum-bg)' }}>
                        <div style={{ width: `${tipAnalytics.baseRatio}%`, background: 'var(--accent3)' }} title={`Base Pay: ${tipAnalytics.baseRatio}%`} />
                        <div style={{ width: `${tipAnalytics.tipRatio}%`, background: 'var(--accent2)' }} title={`Customer Tips: ${tipAnalytics.tipRatio}%`} />
                        <div style={{ width: `${tipAnalytics.topUpRatio}%`, background: 'var(--accent1)' }} title={`Top-Up: ${tipAnalytics.topUpRatio}%`} />
                        {tipAnalytics.totalShopperBumps > 0 && (
                          <div style={{ width: `${tipAnalytics.bumpRatio}%`, background: '#F59E0B' }} title={`Shopper Bumps: ${tipAnalytics.bumpRatio}%`} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Deposit vs EvryTrack Reconciliation Audit Box */}
              <div className="p-4 rounded-2xl border space-y-4" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--accent1)' }}>
                    <span>🏦</span>
                    <span>Bank Deposit Reconciliation Audit</span>
                  </span>

                  <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${monthlyStatement.combinedDepositSummary?.totalCombinedVariance === 0
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : monthlyStatement.combinedDepositSummary?.totalCombinedVariance > 0
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                    {monthlyStatement.combinedDepositSummary?.totalCombinedVariance === 0
                      ? '✅ 100% Fully Reconciled ($0.00 Variance)'
                      : monthlyStatement.combinedDepositSummary?.totalCombinedVariance > 0
                        ? `+${formatCurrency(monthlyStatement.combinedDepositSummary.totalCombinedVariance)} Net Overpay / Bonus`
                        : `${formatCurrency(monthlyStatement.combinedDepositSummary.totalCombinedVariance)} Net Discrepancy`}
                  </span>
                </div>

                {/* Audit Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  {/* Gig Deposit Audit */}
                  {settings.workType !== 'w2_only' && (
                    <div className="p-3 rounded-xl border space-y-2" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-emerald-400">🚗 Gig Bank Deposits</span>
                        <span className="text-[10px] font-bold text-amber-400">
                          {monthlyStatement.depositSummary.totalVariance >= 0
                            ? `+${formatCurrency(monthlyStatement.depositSummary.totalVariance)}`
                            : formatCurrency(monthlyStatement.depositSummary.totalVariance)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <p style={{ color: 'var(--text-sub)' }}>Actual Deposited:</p>
                          <p className="font-bold text-emerald-400 text-xs sm:text-sm font-mono-crisp tabular-nums">{formatCurrency(monthlyStatement.depositSummary.totalBankDeposits)}</p>
                        </div>
                        <div>
                          <p style={{ color: 'var(--text-sub)' }}>App Tracked Total:</p>
                          <p className="font-bold text-xs sm:text-sm font-mono-crisp tabular-nums" style={{ color: 'var(--accent1)' }}>{formatCurrency(monthlyStatement.depositSummary.totalTrackedEarnings)}</p>
                        </div>
                      </div>
                      <p className="text-[10px] font-mono-crisp pt-1.5 border-t leading-tight" style={{ color: 'var(--text-sub)', borderColor: 'var(--card-border)' }}>
                        Includes: Shift Pay ({formatCurrency(monthlyStatement.depositSummary.totalTrackedWorked)}) + Bumps ({formatCurrency(monthlyStatement.depositSummary.totalShopperBumps)})
                      </p>
                    </div>
                  )}

                  {/* W-2 Paycheck Audit */}
                  {settings.workType !== 'gig_only' && (
                    <div className="p-3 rounded-xl border space-y-2" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px]" style={{ color: 'var(--accent1)' }}>🏢 W-2 Paycheck Audit</span>
                        <span className="text-[10px] font-bold text-amber-400">
                          {monthlyStatement.w2DepositSummary.w2Variance >= 0
                            ? `+${formatCurrency(monthlyStatement.w2DepositSummary.w2Variance)}`
                            : formatCurrency(monthlyStatement.w2DepositSummary.w2Variance)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div>
                          <p style={{ color: 'var(--text-sub)' }}>Paycheck Received:</p>
                          <p className="font-bold text-emerald-400">{formatCurrency(monthlyStatement.w2DepositSummary.actualW2Deposited)}</p>
                        </div>
                        <div>
                          <p style={{ color: 'var(--text-sub)' }}>Expected Base:</p>
                          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(monthlyStatement.w2DepositSummary.expectedW2Salary)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: Itemized Weekly & Daily Shift Breakdown Ledger */}
              {settings.workType !== 'w2_only' && monthlyStatement.groupedWeeks?.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="label-text text-sm font-bold" style={{ color: 'var(--accent2)' }}>
                      3. Itemized Weekly & Daily Shift Ledger
                    </h3>
                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-sub)' }}>
                      {monthlyStatement.groupedWeeks.length} Pay Period Weeks
                    </span>
                  </div>

                  <div className="space-y-3">
                    {monthlyStatement.groupedWeeks.map((week, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border overflow-hidden transition-all"
                        style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}
                      >
                        <div className="p-3.5 flex items-center justify-between gap-2 border-b" style={{ borderColor: 'var(--card-border)', background: 'var(--drum-bg)' }}>
                          <div>
                            <span className="font-bold text-xs" style={{ color: 'var(--accent1)' }}>{week.label}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-sm" style={{ color: 'var(--accent1)' }}>
                              {formatCurrency(week.totalEarnings)}
                            </span>
                            {week.actualPayout !== null ? (
                              <p className={`text-[10px] font-mono font-bold ${week.variance >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                Deposit: {formatCurrency(week.actualPayout)} ({week.variance >= 0 ? `+${formatCurrency(week.variance)}` : formatCurrency(week.variance)})
                              </p>
                            ) : (
                              week.totalTopUp > 0 && (
                                <p className="text-[10px] font-mono" style={{ color: 'var(--accent2)' }}>
                                  +{formatCurrency(week.totalTopUp)} Top-Up
                                </p>
                              )
                            )}
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-[850px] w-full text-xs border-collapse">
                            <thead>
                              <tr className="align-middle border-b" style={{ color: 'var(--text-sub)', borderColor: 'var(--card-border)' }}>
                                <th className="text-left py-2.5 px-2 font-bold align-middle whitespace-nowrap" style={{ color: 'var(--accent1)' }}>Date</th>
                                <th className="text-center py-2.5 px-2 font-semibold align-middle whitespace-nowrap">Active Hrs</th>
                                {settings.includeMiles && <th className="text-center py-2.5 px-2 font-semibold align-middle whitespace-nowrap">Miles</th>}
                                <th className="text-center py-2.5 px-2 font-semibold align-middle whitespace-nowrap">(Base Pay)</th>
                                <th className="w-6 text-center py-2.5 px-1 font-bold align-middle opacity-50 text-sm">+</th>
                                <th className="text-center py-2.5 px-2 font-semibold align-middle whitespace-nowrap">(Top-Up)</th>
                                <th className="w-6 text-center py-2.5 px-1 font-bold align-middle opacity-50 text-sm">=</th>
                                <th className="text-center py-2.5 px-2 font-semibold align-middle leading-tight whitespace-nowrap">Guaranteed Pay</th>
                                <th className="w-6 text-center py-2.5 px-1 font-bold align-middle opacity-50 text-sm">+</th>
                                <th className="text-center py-2.5 px-2 font-semibold align-middle whitespace-nowrap">Tips</th>
                                <th className="w-6 text-center py-2.5 px-1 font-bold align-middle opacity-50 text-sm">+</th>
                                <th className="text-center py-2.5 px-2 font-semibold align-middle whitespace-nowrap">Bump</th>
                                <th className="w-6 text-center py-2.5 px-1 font-bold align-middle opacity-50 text-sm">=</th>
                                <th className="text-center py-2.5 px-2 font-bold align-middle whitespace-nowrap" style={{ color: 'var(--accent1)' }}>Total Pay</th>
                              </tr>
                            </thead>
                            <tbody>
                              {week.entries.map((entry) => {
                                const baseVal = parseFloat(entry.basePay) || 0;
                                const topUpVal = (!entry.isOutsideMonth && entry.calc?.adjustmentTopUp > 0) ? entry.calc.adjustmentTopUp : 0;
                                const bumpVal = parseFloat(entry.shopperBump || entry.bump) || 0;
                                const tipsVal = parseFloat(entry.tips) || 0;

                                return (
                                  <tr
                                    key={entry.date}
                                    className={`border-b last:border-0 align-middle transition-opacity ${entry.isOutsideMonth ? 'opacity-50' : ''}`}
                                    style={{ borderColor: 'var(--card-border)', background: entry.isOutsideMonth ? 'var(--drum-bg)' : 'transparent' }}
                                  >
                                    <td className="py-2.5 px-2 text-left font-mono-crisp font-semibold align-middle" style={{ color: entry.isOutsideMonth ? 'var(--text-sub)' : 'var(--text-primary)' }}>
                                      <div className="flex items-center gap-1.5">
                                        <span className="whitespace-nowrap">{new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                        {entry.isOutsideMonth && (
                                          <span className="text-[9px] font-mono-crisp px-1 py-0.5 rounded border whitespace-nowrap opacity-75" style={{ borderColor: 'var(--card-border)', color: 'var(--text-sub)' }}>
                                            Outside Month
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums align-middle" style={{ color: 'var(--text-sub)' }}>
                                      {((entry.activeTimeH !== undefined || entry.activeTimeM !== undefined || entry.activeTimeS !== undefined)
                                        ? convertTimeToDecimal(entry.activeTimeH, entry.activeTimeM, entry.activeTimeS)
                                        : parseFloat(entry.activeHours) || 0).toFixed(2)}h
                                    </td>
                                    {settings.includeMiles && (
                                      <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums align-middle" style={{ color: 'var(--text-sub)' }}>
                                        {entry.activeMiles || 0} mi
                                      </td>
                                    )}
                                    <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums align-middle" style={{ color: 'var(--text-sub)' }}>
                                      ({formatCurrency(baseVal)})
                                    </td>
                                    <td className="w-6 py-2.5 px-1 text-center font-mono-crisp font-bold align-middle opacity-50 text-sm" style={{ color: 'var(--text-sub)' }}>+</td>
                                    <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums align-middle text-amber-400 font-medium">
                                      {topUpVal > 0 ? `(↑${formatCurrency(topUpVal)})` : '($0.00)'}
                                    </td>
                                    <td className="w-6 py-2.5 px-1 text-center font-mono-crisp font-bold align-middle opacity-50 text-sm" style={{ color: 'var(--text-sub)' }}>=</td>
                                    <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums font-semibold align-middle" style={{ color: 'var(--text-primary)' }}>
                                      {formatCurrency(entry.calc?.prop22Floor || 0)}
                                    </td>
                                    <td className="w-6 py-2.5 px-1 text-center font-mono-crisp font-bold align-middle opacity-50 text-sm" style={{ color: 'var(--text-sub)' }}>+</td>
                                    <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums align-middle" style={{ color: entry.isOutsideMonth ? 'var(--text-sub)' : 'var(--accent2)' }}>
                                      {formatCurrency(tipsVal)}
                                    </td>
                                    <td className="w-6 py-2.5 px-1 text-center font-mono-crisp font-bold align-middle opacity-50 text-sm" style={{ color: 'var(--text-sub)' }}>+</td>
                                    <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums align-middle text-amber-400 font-medium">
                                      {bumpVal > 0 ? `↑${formatCurrency(bumpVal)}` : '-'}
                                    </td>
                                    <td className="w-6 py-2.5 px-1 text-center font-mono-crisp font-bold align-middle text-sm" style={{ color: 'var(--accent1)' }}>=</td>
                                    <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums font-bold align-middle" style={{ color: entry.isOutsideMonth ? 'var(--text-sub)' : 'var(--accent1)' }}>
                                      {formatCurrency(entry.calc?.totalShiftEarnings || 0)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot style={{ borderTop: '2px solid var(--card-border)', background: 'var(--header-bg)' }}>
                              <tr className="font-bold text-xs align-middle">
                                <td className="py-2.5 px-2 text-left font-mono-crisp align-middle" style={{ color: 'var(--accent1)' }}>Week Totals</td>
                                <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums align-middle" style={{ color: 'var(--text-primary)' }}>{week.totalHours.toFixed(2)}h</td>
                                {settings.includeMiles && (
                                  <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums align-middle" style={{ color: 'var(--text-primary)' }}>{week.totalMiles} mi</td>
                                )}
                                <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums align-middle" style={{ color: 'var(--text-sub)' }}>({formatCurrency(week.totalBase)})</td>
                                <td className="w-6 py-2.5 px-1 text-center font-mono-crisp align-middle opacity-50 text-sm">+</td>
                                <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums align-middle text-amber-400 font-medium">
                                  {week.totalTopUp > 0 ? `(↑${formatCurrency(week.totalTopUp)})` : '($0.00)'}
                                </td>
                                <td className="w-6 py-2.5 px-1 text-center font-mono-crisp align-middle opacity-50 text-sm">=</td>
                                <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums align-middle" style={{ color: 'var(--text-primary)' }}>{formatCurrency(week.totalFloor)}</td>
                                <td className="w-6 py-2.5 px-1 text-center font-mono-crisp align-middle opacity-50 text-sm">+</td>
                                <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums align-middle" style={{ color: 'var(--accent2)' }}>{formatCurrency(week.totalTips)}</td>
                                <td className="w-6 py-2.5 px-1 text-center font-mono-crisp align-middle opacity-50 text-sm">+</td>
                                <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums align-middle text-amber-400 font-medium">
                                  {week.shopperBump > 0 ? `↑${formatCurrency(week.shopperBump)}` : '-'}
                                </td>
                                <td className="w-6 py-2.5 px-1 text-center font-mono-crisp align-middle text-sm" style={{ color: 'var(--accent1)' }}>=</td>
                                <td className="py-2.5 px-2 text-center font-mono-crisp tabular-nums font-bold align-middle" style={{ color: 'var(--accent1)' }}>{formatCurrency(week.totalEarnings)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ──────── ANNUAL ROLLUP MODE UI ──────── */}
          {statementMode === 'annual' && (
            <div className="space-y-6">
              {/* Annual Executive Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl border" style={{ background: 'var(--drum-bg)', borderColor: 'var(--accent1)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>2026 Annual Gross Income</p>
                  <p className="font-mono font-bold text-2xl" style={{ color: 'var(--accent1)' }}>
                    {formatCurrency(annualRollup.grandTotalAnnual)}
                  </p>
                  <p className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--text-sub)' }}>W-2 + Gig + Tips + Top-Ups</p>
                </div>

                {settings.workType !== 'gig_only' && (
                  <div className="p-4 rounded-2xl border" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>Annual W-2 Salary</p>
                    <p className="font-mono font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(annualRollup.totalAnnualW2)}
                    </p>
                    <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--text-sub)' }}>Accumulated Monthly W-2</p>
                  </div>
                )}

                {settings.workType !== 'w2_only' && (
                  <div className="p-4 rounded-2xl border" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-sub)' }}>Annual Gig Earnings</p>
                    <p className="font-mono font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(annualRollup.totalGigAllYear)}
                    </p>
                    <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--accent2)' }}>
                      Base + Tips + Top-Up
                    </p>
                  </div>
                )}
              </div>

              {/* Annual Tip Ratio Analytics & Distribution */}
              {settings.workType !== 'w2_only' && (
                <div className="space-y-3">
                  <h3 className="label-text text-sm font-bold" style={{ color: 'var(--accent2)' }}>
                    1. Annual Tip Ratio & Earnings Analytics
                  </h3>

                  <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                        <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text-sub)' }}>Annual Gig Tips</p>
                        <p className="font-mono font-bold text-sm sm:text-base" style={{ color: 'var(--accent2)' }}>
                          {formatCurrency(annualRollup.totalTipsAllYear)}
                        </p>
                        <p className="text-[10px] font-mono leading-tight mt-1" style={{ color: 'var(--accent2)' }}>{annualRollup.tipRatio}% of total pay</p>
                      </div>

                      <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                        <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text-sub)' }}>Avg Pay / Hr</p>
                        <p className="font-mono font-bold text-sm sm:text-base whitespace-nowrap" style={{ color: 'var(--accent1)' }}>
                          ${annualRollup.gigPerHour.toFixed(2)}/hr
                        </p>
                        <p className="text-[10px] font-mono leading-tight mt-1" style={{ color: 'var(--text-sub)' }}>incl. ${annualRollup.tipPerHour.toFixed(2)}/hr tips</p>
                      </div>

                      <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                        <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text-sub)' }}>Base Pay</p>
                        <p className="font-mono font-bold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                          {formatCurrency(annualRollup.totalBaseAllYear)}
                        </p>
                        <p className="text-[10px] leading-tight mt-1" style={{ color: 'var(--text-sub)' }}>{annualRollup.baseRatio}% of total pay</p>
                      </div>

                      <div className="p-3 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                        <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text-sub)' }}>Top-Up</p>
                        <p className="font-mono font-bold text-sm sm:text-base text-amber-400">
                          {formatCurrency(annualRollup.totalTopUpAllYear)}
                        </p>
                        <p className="text-[10px] leading-tight mt-1" style={{ color: 'var(--text-sub)' }}>{annualRollup.topUpRatio}% of total pay</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5" style={{ color: 'var(--text-sub)' }}>
                        <span>Annual Income Distribution Scope</span>
                        <span>Base {annualRollup.baseRatio}% • Tips {annualRollup.tipRatio}% • Top-Up {annualRollup.topUpRatio}%</span>
                      </div>
                      <div className="w-full h-3 rounded-full overflow-hidden flex" style={{ background: 'var(--drum-bg)' }}>
                        <div style={{ width: `${annualRollup.baseRatio}%`, background: 'var(--accent3)' }} title={`Base Pay: ${annualRollup.baseRatio}%`} />
                        <div style={{ width: `${annualRollup.tipRatio}%`, background: 'var(--accent2)' }} title={`Customer Tips: ${annualRollup.tipRatio}%`} />
                        <div style={{ width: `${annualRollup.topUpRatio}%`, background: 'var(--accent1)' }} title={`Top-Up: ${annualRollup.topUpRatio}%`} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mileage & Tax Deduction Example Card */}
              <div className="p-5 rounded-2xl border space-y-3" style={{ background: 'var(--header-bg)', borderColor: 'var(--card-border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="label-text text-sm font-bold" style={{ color: 'var(--accent2)' }}>
                      2. Tracked Mileage & Tax Deduction Example
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>
                      Annual active driving mileage log for tax estimation
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                      {annualRollup.totalMiles.toLocaleString('en-US', { maximumFractionDigits: 1 })} mi
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border text-xs font-mono" style={{ background: 'var(--drum-bg)', borderColor: 'var(--card-border)' }}>
                  <p className="font-semibold" style={{ color: 'var(--accent1)' }}>
                    {annualRollup.deductionExampleText}
                  </p>
                </div>
              </div>

              {/* 12-Month Monthly Gig Performance Breakdown Table */}
              <div className="space-y-3">
                <h3 className="label-text text-sm font-bold" style={{ color: 'var(--accent2)' }}>
                  3. 12-Month Monthly Gig Performance Breakdown (2026)
                </h3>
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--card-border)', background: 'var(--drum-bg)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="align-top" style={{ color: 'var(--text-sub)', borderBottom: '1px solid var(--card-border)' }}>
                        <th className="text-left py-3 px-3 font-semibold align-top whitespace-nowrap">Month</th>
                        <th className="text-center py-3 px-2 font-semibold align-top whitespace-nowrap">Active Hrs</th>
                        <th className="text-center py-3 px-2 font-semibold align-top whitespace-nowrap">Miles</th>
                        <th className="text-center py-3 px-2 font-semibold align-top whitespace-nowrap">Base Pay</th>
                        <th className="text-center py-3 px-2 font-semibold align-top whitespace-nowrap">Top-Up</th>
                        <th className="text-center py-3 px-2 font-semibold align-top whitespace-nowrap">Gig Tips</th>
                        <th className="text-center py-3 px-2 font-semibold align-top whitespace-nowrap">$/Hr Rate</th>
                        <th className="text-center py-3 px-3 font-semibold align-top whitespace-nowrap">Total Gig Pay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {annualRollup.monthlyRows.map(row => (
                        <tr key={row.monthNum} className={`border-b last:border-0 ${row.hasData ? '' : 'opacity-40'}`} style={{ borderColor: 'var(--card-border)' }}>
                          <td className="py-3 px-3 text-left font-medium" style={{ color: row.hasData ? 'var(--text-primary)' : 'var(--text-sub)' }}>
                            {row.monthName} {row.monthName === monthLabel.split(' ')[0] ? '(Active)' : ''}
                          </td>
                          <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-sub)' }}>
                            {row.hours}h
                          </td>
                          <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-sub)' }}>
                            {row.miles} mi
                          </td>
                          <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-primary)' }}>
                            {formatCurrency(row.basePay)}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-amber-400 font-bold">
                            {row.topUp > 0 ? `+${formatCurrency(row.topUp)}` : '$0.00'}
                          </td>
                          <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--accent2)' }}>
                            {formatCurrency(row.tips)}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold" style={{ color: 'var(--accent1)' }}>
                            {row.hours > 0 ? `$${row.effectiveRate.toFixed(2)}/h` : '$0.00/h'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold" style={{ color: 'var(--accent1)' }}>
                            {formatCurrency(row.gigTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ borderTop: '2px solid var(--card-border)', background: 'var(--header-bg)' }}>
                      <tr className="font-bold text-xs">
                        <td className="py-3 px-3 text-left" style={{ color: 'var(--accent1)' }}>Full Year Totals</td>
                        <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-primary)' }}>{annualRollup.totalHoursAllYear.toFixed(2)}h</td>
                        <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-primary)' }}>{annualRollup.totalMiles} mi</td>
                        <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(annualRollup.totalBaseAllYear)}</td>
                        <td className="py-3 px-2 text-center font-mono text-amber-400">+{formatCurrency(annualRollup.totalTopUpAllYear)}</td>
                        <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--accent2)' }}>{formatCurrency(annualRollup.totalTipsAllYear)}</td>
                        <td className="py-3 px-2 text-center font-mono" style={{ color: 'var(--accent1)' }}>${annualRollup.gigPerHour.toFixed(2)}/h</td>
                        <td className="py-3 px-3 text-center font-mono text-sm" style={{ color: 'var(--accent1)' }}>{formatCurrency(annualRollup.totalGigTotal || annualRollup.totalGigAllYear)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Statement Legal Disclaimer Notice Box */}
          <div className="p-4 rounded-2xl border space-y-1.5 text-left" style={{ background: 'color-mix(in srgb, #f59e0b 8%, transparent)', borderColor: 'color-mix(in srgb, #f59e0b 30%, transparent)' }}>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Notice & Legal Disclaimer
            </p>
            <p className="text-[11px] leading-relaxed font-mono" style={{ color: 'var(--text-sub)' }}>
              This statement is generated by EvryTrack as a personal earnings record based on user-entered shift data and local guarantee calculations. EvryTrack is an independent software application and is not an employer, financial institution, or payroll processor. This document is provided solely for personal accounting, income tracking, and preliminary tax preparation assistance. It does not constitute an official employer paystub or legal proof of income for loan applications. Please consult a certified tax professional or CPA for official filings.
            </p>
          </div>

          {/* Statement Footer Notice */}
          <div className="pt-3 border-t text-center space-y-1" style={{ borderColor: 'var(--card-border)' }}>
            <p className="text-[11px] font-medium" style={{ color: 'var(--text-sub)' }}>
              EvryTrack Automated Financial Statement • Personal Confidential Record
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-sub)' }}>
              Calculations incorporate local minimum wage guarantees and optional mileage reimbursements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
