
import React, { useState, useEffect } from 'react';
import './FinancialCashflowCalculator.css';
import {
  calculateNPV,
  calculateXNPV,
  calculateIRR,
  calculateXIRR,
  calculateMIRR,
  generateAmortizationSchedule,
  simulatePrepayment,
  generateRateSensitivityTable,
  generateTwoWaySensitivityTable,
  exportSensitivityToCSV,
  downloadCSV,
  generateRateSensitivityTableXIRR,
  formatCurrency,
  formatPercent,
  formatAmount,
  PROJECT_NPV_EXAMPLE,
  MORTGAGE_EXAMPLE,
  MULTIPLE_IRR_EXAMPLE,
  DAY_COUNT_METHODS,
  LOAN_TYPE,
} from './logic/index.js';

const TABS = {
  CASHFLOW: 'cashflow',
  LOAN: 'loan',
  SENSITIVITY: 'sensitivity',
};

export default function FinancialCashflowCalculator() {
  const [activeTab, setActiveTab] = useState(TABS.CASHFLOW);

  const [cashflows, setCashflows] = useState([
    { date: '2024-01-01', amount: -1000000 },
    { date: '2024-12-31', amount: 250000 },
    { date: '2025-12-31', amount: 350000 },
  ]);
  const [discountRate, setDiscountRate] = useState(0.1);
  const [dayCountMethod, setDayCountMethod] = useState(DAY_COUNT_METHODS.ACT_365);
  const [financeRate, setFinanceRate] = useState(0.08);
  const [reinvestRate, setReinvestRate] = useState(0.06);
  const [cashflowResults, setCashflowResults] = useState(null);
  const [cashflowError, setCashflowError] = useState(null);

  const [loanParams, setLoanParams] = useState({
    principal: 1000000,
    annualRate: 0.042,
    periods: 360,
    loanType: LOAN_TYPE.EQUAL_INSTALLMENT,
  });
  const [loanResults, setLoanResults] = useState(null);
  const [prepaymentEnabled, setPrepaymentEnabled] = useState(false);
  const [prepaymentPeriod, setPrepaymentPeriod] = useState(60);
  const [prepaymentAmount, setPrepaymentAmount] = useState(100000);
  const [prepaymentType, setPrepaymentType] = useState('reduce_period');
  const [prepaymentResults, setPrepaymentResults] = useState(null);

  const [sensitivityResults, setSensitivityResults] = useState(null);
  const [sensitivityBaseRate, setSensitivityBaseRate] = useState(0.1);

  const handleAddCashflow = () => {
    setCashflows([...cashflows, { date: '2026-12-31', amount: 0 }]);
  };

  const handleRemoveCashflow = (index) => {
    if (cashflows.length > 2) {
      setCashflows(cashflows.filter((_, i) => i !== index));
    }
  };

  const handleCashflowChange = (index, field, value) => {
    const updated = [...cashflows];
    updated[index] = { ...updated[index], [field]: field === 'amount' ? Number(value) : value };
    setCashflows(updated);
  };

  const calculateCashflowResults = () => {
    try {
      setCashflowError(null);
      const npv = calculateXNPV(cashflows, discountRate, dayCountMethod);
      const irrResult = calculateXIRR(cashflows, { dayCountMethod });
      const cashflowAmounts = cashflows.map(cf => cf.amount);
      let mirr = null;
      try {
        mirr = calculateMIRR(cashflowAmounts, financeRate, reinvestRate);
      } catch (e) {
        mirr = null;
      }

      setCashflowResults({
        npv,
        irr: irrResult.xirr,
        irrMessage: irrResult.message,
        hasMultipleIRR: irrResult.hasMultipleIRR,
        irrSolutions: irrResult.solutions,
        totalCashflow: cashflows.reduce((sum, cf) => sum + cf.amount, 0),
        mirr,
      });
    } catch (e) {
      setCashflowError(e.message);
    }
  };

  useEffect(() => {
    calculateCashflowResults();
  }, [cashflows, discountRate, dayCountMethod, financeRate, reinvestRate]);

  const handleCalculateLoan = () => {
    try {
      const result = generateAmortizationSchedule(loanParams);
      setLoanResults(result);
      setPrepaymentResults(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulatePrepayment = () => {
    if (!loanResults) return;
    try {
      const result = simulatePrepayment(
        loanResults,
        prepaymentPeriod,
        prepaymentAmount,
        prepaymentType,
        loanParams.annualRate,
        loanParams.loanType
      );
      setPrepaymentResults(result);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCalculateSensitivity = () => {
    const cashflowAmounts = cashflows.map(cf => cf.amount);
    const rateTable = generateRateSensitivityTable(
      cashflowAmounts,
      sensitivityBaseRate,
      0.01,
      5
    );
    const twoWayTable = generateTwoWaySensitivityTable(
      cashflowAmounts,
      sensitivityBaseRate,
      1
    );
    setSensitivityResults({ rateTable, twoWayTable });
  };

  const handleExportCSV = () => {
    if (!sensitivityResults) return;
    const csv = exportSensitivityToCSV(sensitivityResults.rateTable, 'rate');
    downloadCSV(csv, 'sensitivity_analysis.csv');
  };

  const loadExample = (example) => {
    if (example === 'project') {
      setCashflows(PROJECT_NPV_EXAMPLE.cashflows.map(cf => ({
        date: cf.date, amount: cf.amount })));
      setDiscountRate(PROJECT_NPV_EXAMPLE.discountRate);
      setSensitivityBaseRate(PROJECT_NPV_EXAMPLE.discountRate);
    } else if (example === 'mortgage') {
      setLoanParams({
        principal: MORTGAGE_EXAMPLE.principal,
        annualRate: MORTGAGE_EXAMPLE.annualRate,
        periods: MORTGAGE_EXAMPLE.periods,
        loanType: MORTGAGE_EXAMPLE.loanType,
      });
    } else if (example === 'multiple-irr') {
      setCashflows(MULTIPLE_IRR_EXAMPLE.cashflows.map(cf => ({
        date: cf.date, amount: cf.amount })));
    }
    setCashflowResults(null);
    setLoanResults(null);
    setSensitivityResults(null);
  };

  return (
    <div className="financial-cashflow-calculator">
      <div className="disclaimer">
        <strong>⚠️ 免责声明：</strong>本工具计算结果仅供参考，不构成任何投资建议。实际投资决策请结合自身情况谨慎决策。
      </div>

      <div className="examples-bar">
        <button className="example-btn" onClick={() => loadExample('project')}>
          📊 项目 NPV 示例
        </button>
        <button className="example-btn" onClick={() => loadExample('mortgage')}>
          🏠 房贷 30 年示例
        </button>
        <button className="example-btn" onClick={() => loadExample('multiple-irr')}>
          ⚠️ 多重 IRR 示例
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === TABS.CASHFLOW ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.CASHFLOW)}
        >
          💰 现金流计算（NPV/IRR）
        </button>
        <button
          className={`tab ${activeTab === TABS.LOAN ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.LOAN)}
        >
          🏦 贷款摊销
        </button>
        <button
          className={`tab ${activeTab === TABS.SENSITIVITY ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.SENSITIVITY)}
        >
          📈 敏感性分析
        </button>
      </div>

      {activeTab === TABS.CASHFLOW && (
        <div className="tab-content">
          <div className="section">
          <h3 className="section-title">现金流输入</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">贴现率</label>
              <input
                type="number"
                className="form-input"
                value={discountRate}
                onChange={(e) => setDiscountRate(Number(e.target.value))}
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label className="form-label">日计数法</label>
              <select
                className="form-select"
                value={dayCountMethod}
                onChange={(e) => setDayCountMethod(e.target.value)}
              >
                <option value={DAY_COUNT_METHODS.ACT_365}>Act/365</option>
                <option value={DAY_COUNT_METHODS.THIRTY_360}>30/360</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">融资利率（MIRR）</label>
              <input
                type="number"
                className="form-input"
                value={financeRate}
                onChange={(e) => setFinanceRate(Number(e.target.value))}
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label className="form-label">再投资率（MIRR）</label>
              <input
                type="number"
                className="form-input"
                value={reinvestRate}
                onChange={(e) => setReinvestRate(Number(e.target.value))}
                step="0.01"
              />
            </div>
          </div>

          <table className="cashflow-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>金额（收入正/支出负）</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {cashflows.map((cf, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="date"
                      className="form-input"
                      value={cf.date}
                      onChange={(e) => handleCashflowChange(index, 'date', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-input"
                      value={cf.amount}
                      onChange={(e) => handleCashflowChange(index, 'amount', e.target.value)}
                    />
                  </td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => handleRemoveCashflow(index)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="add-row-btn" onClick={handleAddCashflow}>
            + 添加现金流
          </button>

          {cashflowError && (
            <div className="error-message">{cashflowError}</div>
          )}

          {cashflowResults && (
            <div className="results">
              <div className="result-item">
                <span className="result-label">净现值（NPV）：</span>
                <span className={`result-value ${cashflowResults.npv >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(cashflowResults.npv)}
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">内部收益率（IRR）：</span>
                <span className={`result-value ${cashflowResults.irr ? 'positive' : 'warning'}`}>
                  {cashflowResults.irr !== null ? formatPercent(cashflowResults.irr) : '无有效解'}
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">修正内部收益率（MIRR）：</span>
                <span className="result-value positive">
                  {cashflowResults.mirr !== null ? formatPercent(cashflowResults.mirr) : '无有效解'}
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">现金流总和：</span>
                <span className="result-value">
                  {formatCurrency(cashflowResults.totalCashflow)}
                </span>
              </div>
              {cashflowResults.hasMultipleIRR && (
                <div className="info-message">
                  {cashflowResults.irrMessage}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === TABS.LOAN && (
        <div className="tab-content">
          <div className="section">
            <h3 className="section-title">贷款参数</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">贷款本金</label>
                <input
                  type="number"
                  className="form-input"
                  value={loanParams.principal}
                  onChange={(e) => setLoanParams({ ...loanParams, principal: Number(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">年利率</label>
                <input
                  type="number"
                  className="form-input"
                  value={loanParams.annualRate}
                  onChange={(e) => setLoanParams({ ...loanParams, annualRate: Number(e.target.value)})}
                  step="0.001"
                />
              </div>
              <div className="form-group">
                <label className="form-label">还款期数（月）</label>
                <input
                  type="number"
                  className="form-input"
                  value={loanParams.periods}
                  onChange={(e) => setLoanParams({ ...loanParams, periods: parseInt(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">还款方式</label>
                <select
                  className="form-select"
                  value={loanParams.loanType}
                  onChange={(e) => setLoanParams({ ...loanParams, loanType: e.target.value })}
                >
                  <option value={LOAN_TYPE.EQUAL_INSTALLMENT}>等额本息</option>
                  <option value={LOAN_TYPE.EQUAL_PRINCIPAL}>等额本金</option>
                </select>
              </div>
            </div>

            <button className="calculate-btn" onClick={handleCalculateLoan}>
              生成摊销表
            </button>

            {loanResults && (
              <>
                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="summary-card-title">月供</div>
                    <div className="summary-card-value">
                      {formatCurrency(loanResults.monthlyPayment || loanResults.firstPayment.payment)}
                    </div>
                  </div>
                  <div className="summary-card alt">
                    <div className="summary-card-title">总利息</div>
                    <div className="summary-card-value">
                      {formatCurrency(loanResults.totalInterest)}
                    </div>
                  </div>
                  <div className="summary-card alt2">
                    <div className="summary-card-title">总还款</div>
                    <div className="summary-card-value">
                      {formatCurrency(loanResults.totalPayment)}
                    </div>
                  </div>
                </div>

                <div className="prepayment-section">
                  <div className="prepayment-title">提前还款模拟</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">启用提前还款</label>
                      <input
                        type="checkbox"
                        checked={prepaymentEnabled}
                        onChange={(e) => setPrepaymentEnabled(e.target.checked)}
                      />
                    </div>
                    {prepaymentEnabled && (
                      <>
                        <div className="form-group">
                          <label className="form-label">还款期数</label>
                          <input
                            type="number"
                            className="form-input"
                            value={prepaymentPeriod}
                            onChange={(e) => setPrepaymentPeriod(parseInt(e.target.value))}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">提前还款金额</label>
                          <input
                            type="number"
                            className="form-input"
                            value={prepaymentAmount}
                            onChange={(e) => setPrepaymentAmount(Number(e.target.value))}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">还款方式</label>
                          <select
                            className="form-select"
                            value={prepaymentType}
                            onChange={(e) => setPrepaymentType(e.target.value)}
                          >
                            <option value="reduce_period">缩短期限</option>
                            <option value="reduce_payment">减少月供</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <button className="calculate-btn" onClick={handleSimulatePrepayment}>
                            模拟
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {prepaymentResults && (
                    <div className="info-message">
                      节省利息：{formatCurrency(prepaymentResults.interestSaved)}
                    </div>
                  )}
                </div>

                <div className="table-container">
                  <table className="amortization-table">
                    <thead>
                      <tr>
                        <th>期数</th>
                        <th>日期</th>
                        <th>月供</th>
                        <th>本金</th>
                        <th>利息</th>
                        <th>剩余本金</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(prepaymentResults ? prepaymentResults.schedule : loanResults.schedule).map((row) => (
                        <tr key={row.period} className={row.prepayment ? 'prepayment-row' : ''}>
                          <td>{row.period}</td>
                          <td>{row.date}</td>
                          <td>{formatCurrency(row.payment)}</td>
                          <td>{formatCurrency(row.principal)}</td>
                          <td>{formatCurrency(row.interest)}</td>
                          <td>{formatCurrency(row.remainingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === TABS.SENSITIVITY && (
        <div className="tab-content">
          <div className="section">
            <h3 className="section-title">敏感性分析参数</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">基准贴现率</label>
                <input
                  type="number"
                  className="form-input"
                  value={sensitivityBaseRate}
                  onChange={(e) => setSensitivityBaseRate(Number(e.target.value))}
                  step="0.01"
                />
              </div>
            </div>
            <div className="info-message">
              💡 敏感性分析使用现金流 Tab 的金额数据（共 {cashflows.length} 期）
            </div>
            <button className="calculate-btn" onClick={handleCalculateSensitivity}>
              生成敏感性分析
            </button>
            {sensitivityResults && (
              <>
                <h4>贴现率敏感性（±5%）</h4>
                <table className="sensitivity-table">
                  <thead>
                    <tr>
                      <th>贴现率</th>
                      <th>变动</th>
                      <th>NPV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivityResults.rateTable.table.map((row, index) => (
                      <tr key={index}>
                        <td>{row.rateDisplay}</td>
                        <td>{row.deltaDisplay}</td>
                        <td className="sensitivity-cell" style={{ backgroundColor: sensitivityResults.twoWayTable.getHeatColor(row.npv) }}>
                          {formatCurrency(row.npv)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h4>二维敏感性分析（贴现率 × 现金流变动）</h4>
                <table className="sensitivity-table">
                  <thead>
                    <tr>
                      <th>现金流变动 ↓ / 贴现率 →</th>
                      {sensitivityResults.twoWayTable.rateHeaders.map((h, i) => (
                        <th key={i}>{h.display}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivityResults.twoWayTable.cfHeaders.map((cfh, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className="row-header">{cfh.display}</td>
                        {sensitivityResults.twoWayTable.data[rowIndex].map((value, colIndex) => (
                          <td
                            key={colIndex}
                            className="sensitivity-cell"
                            style={{ backgroundColor: sensitivityResults.twoWayTable.getHeatColor(value) }}
                          >
                            {formatCurrency(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button className="export-btn" onClick={handleExportCSV}>
                  导出 CSV
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
