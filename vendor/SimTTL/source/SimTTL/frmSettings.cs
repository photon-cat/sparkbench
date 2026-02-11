// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using SimBase;

namespace SimTTL
{
    public partial class frmSettings : Form
    {
        private const UInt64 DEFAULT_RETURN_UINT64 = UInt64.MaxValue;
        private const double DEFAULT_RETURN_DOUBLE = double.MinValue;

        private List<int> StimulusBits;
        private List<int> TriggerBits;

        private List<Stimulus> CurrentStimuli;
        private List<Trigger> CurrentTriggers;

        private frmMain main;

        /// <summary>Reference to the grid cell.</summary>
        DataGridViewCell currentCell;

        /// <summary>
        /// Creates the instance of the settings form.
        /// </summary>
        /// <param name="StimuliSignals">List of current signals.</param>
        public frmSettings(frmMain Main, List<DisplaySignal> StimuliSignals, List<DisplaySignal> TriggerSignals, List<Stimulus> CurrentStimuli, List<Trigger> CurrentTriggers)
        {
            InitializeComponent();
            main = Main;
            for (int i = 0; i < 10; i++)
            {
                DataRow row = dtStimulus.NewRow();
                row[0] = i.ToString();
                dtStimulus.Rows.Add(row);
                 
                row = dtTrigger.NewRow();
                row[0] = i.ToString();
                dtTrigger.Rows.Add(row);
            }

            StimulusBits = new List<int>();
            for (int i = 0; i < StimuliSignals.Count; i++)
            {
                cbStimulusSignalSelector.Items.Add(StimuliSignals[i].ScreenName);
                StimulusBits.Add(StimuliSignals[i].DisplayPins.Length);
            }

            TriggerBits = new List<int>();
            for (int i = 0; i < TriggerSignals.Count; i++)
            {
                cbTriggerSignalSelector.Items.Add(TriggerSignals[i].ScreenName);
                TriggerBits.Add(TriggerSignals[i].DisplayPins.Length);
            }

            for (int i = 0; i < Stimulus.OutStr.Length; i++)
                cbOutput.Items.Add(Stimulus.OutStr[i]);

            for (int i = 0; i < Trigger.CondStr.Length; i++)
                cbConditionSelector.Items.Add(Trigger.CondStr[i]);

            for (int i = 0; i < Trigger.LogicStr.Length; i++)
                cbLogicSelector.Items.Add(Trigger.LogicStr[i]);

            this.CurrentStimuli = CurrentStimuli;
            this.CurrentTriggers = CurrentTriggers;

        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void frmSettings_Shown(object sender, EventArgs e)
        {
            if (CurrentStimuli != null)
                for (int i = 0; i < CurrentStimuli.Count; i++)
                {
                    dgvStimulus.Rows[i].Cells[1].Value = CurrentStimuli[i].SignalName;
                    dgvStimulus.Rows[i].Cells[2].Value = CurrentStimuli[i].Pins.Length;
                    dgvStimulus.Rows[i].Cells[3].Value = Stimulus.OutStr[(int)CurrentStimuli[i].Output];
                    dgvStimulus.Rows[i].Cells[4].Value = CurrentStimuli[i].ValueStr;
                    dgvStimulus.Rows[i].Cells[5].Value = CurrentStimuli[i].TimeStr;
                    dgvStimulus.Rows[i].Cells[6].Value = CurrentStimuli[i].DurationStr;
                }

            if (CurrentTriggers != null)
                for (int i = 0; i < CurrentTriggers.Count; i++)
                {
                    dgvTrigger.Rows[i].Cells[1].Value = CurrentTriggers[i].SignalName;
                    dgvTrigger.Rows[i].Cells[2].Value = CurrentTriggers[i].Bits;
                    dgvTrigger.Rows[i].Cells[3].Value = Trigger.CondStr[(int)CurrentTriggers[i].Condition];
                    dgvTrigger.Rows[i].Cells[4].Value = CurrentTriggers[i].CompareValueStr;
                    dgvTrigger.Rows[i].Cells[5].Value = Trigger.LogicStr[(int)CurrentTriggers[i].Logic];
                }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void frmSettings_Resize(object sender, EventArgs e)
        {
            pnTop.Height = (int)((ClientSize.Height - pnControl.Height) * 0.52f);
        }

        /// <summary>
        /// Converts the cell value to a UInt64.
        /// </summary>
        /// <param name="Cell">Cell contents to convert.</param>
        /// <returns>Converted value from the cell contents.</returns>
        private UInt64 ConvertUInt64(DataGridViewCell Cell)
        {
            string s = Cell.Value.ToString().Trim();
            while (s.Length > 1)
            {
                if (s[0] == '0')
                    s = s.Substring(1);
                else
                    break;
            }

            UInt64 result = DEFAULT_RETURN_UINT64;
            try
            {
                if (s.StartsWith("b") == true)
                    result = Convert.ToUInt64(s.Substring(1), 2);
                if (s.StartsWith("x") == true) 
                    result = Convert.ToUInt64(s.Substring(1), 16);
                else
                    result = Convert.ToUInt32(s);
            }
            catch { }
            return result;
        }

        /// <summary>
        /// Converts the cell value to a double.
        /// </summary>
        /// <param name="Cell">Cell contents to convert.</param>
        /// <returns>Converted value from the cell contents.</returns>
        private double ConvertDouble(DataGridViewCell Cell)
        {
            string s = Cell.Value.ToString();
            double result = DEFAULT_RETURN_DOUBLE;
            try
            {
                result = Convert.ToDouble(s);
            }
            catch { }
            return result;
        }

        /// <summary>
        /// DatagridView cell click handler to edit the specific cell contents depending on the columns.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void dgvStimulus_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            Rectangle rect = dgvStimulus.GetCellDisplayRectangle(e.ColumnIndex, e.RowIndex, true);
            currentCell = dgvStimulus.CurrentCell;

            switch (e.ColumnIndex)
            {
                case 0:
                    cbStimulusSignalSelector.Visible = false;
                    cbOutput.Visible = false;
                    break;

                case 1:
                    cbStimulusSignalSelector.SetBounds(dgvStimulus.Location.X + rect.X, dgvStimulus.Location.Y + rect.Y, rect.Width, rect.Height);
                    cbStimulusSignalSelector.Visible = true;
                    cbOutput.Visible = false;
                    break;

                case 3:
                    cbOutput.SetBounds(dgvStimulus.Location.X + rect.X, dgvStimulus.Location.Y + rect.Y, rect.Width, rect.Height);
                    cbOutput.Visible = true;
                    cbStimulusSignalSelector.Visible = false;
                    break;

                default:
                    cbStimulusSignalSelector.Visible = false;
                    cbOutput.Visible = false;
                    break;
            }
        }

        /// <summary>
        /// Datagrid cell leave handler to check the validity of the column 3 entry. If the number cannot be converted, the cell stays selected.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void dgvStimulus_CellLeave(object sender, DataGridViewCellEventArgs e)
        {
            if (e.ColumnIndex == 4)
            {
                try
                {
                    if (ConvertUInt64(dgvStimulus.Rows[e.RowIndex].Cells[e.ColumnIndex]) == DEFAULT_RETURN_UINT64)
                        dgvStimulus.Rows[e.RowIndex].Cells[e.ColumnIndex].Selected = true;
                }
                catch
                {
                    dgvStimulus.Rows[e.RowIndex].Cells[e.ColumnIndex].Selected = true;
                }
            }
            else if ((e.ColumnIndex == 5) || (e.ColumnIndex == 6))
            {
                try
                {
                    if (ConvertDouble(dgvStimulus.Rows[e.RowIndex].Cells[e.ColumnIndex]) == DEFAULT_RETURN_DOUBLE)
                        dgvStimulus.Rows[e.RowIndex].Cells[e.ColumnIndex].Selected = true;
                }
                catch
                {
                    dgvStimulus.Rows[e.RowIndex].Cells[e.ColumnIndex].Selected = true;
                }
            }
        }

        /// <summary>
        /// ComboBox index change handler to update the signal selection of the cell.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void cbStimulusSignalSelector_SelectedIndexChanged(object sender, EventArgs e)
        {
            currentCell.Value = cbStimulusSignalSelector.Items[cbStimulusSignalSelector.SelectedIndex].ToString();
            dgvStimulus.Rows[currentCell.RowIndex].Cells[2].Value = StimulusBits[cbStimulusSignalSelector.SelectedIndex];
            cbStimulusSignalSelector.Visible = false;
            currentCell = null;
        }

        /// <summary>
        /// ComboBox index change handler to update the output type of the cell.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void cbOutput_SelectedIndexChanged(object sender, EventArgs e)
        {
            currentCell.Value = cbOutput.Text;
            cbOutput.Visible = false;
            currentCell = null;
        }

        /// <summary>
        /// Convert the output type string into enumeration value.
        /// </summary>
        /// <param name="OutputStr">Output type string to convert.</param>
        /// <returns>Pulse.OutputType that matches.</returns>
        private Stimulus.OutputType MatchOutput(string OutputStr)
        {
            for (int i = 0; i < Stimulus.OutStr.Length; i++)
            {
                if (Stimulus.OutStr[i] == OutputStr)
                    return (Stimulus.OutputType)i;
            }
            return Stimulus.OutputType.Standard;
        }


        /// <summary>
        /// DatagridView cell click handler to edit the specific cell contents depending on the columns.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void dgvTrigger_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            Rectangle rect = dgvTrigger.GetCellDisplayRectangle(e.ColumnIndex, e.RowIndex, true);
            currentCell = dgvTrigger.CurrentCell;

            switch ( e.ColumnIndex)
            {
                case 0:
                    cbTriggerSignalSelector.Visible = false;
                    cbConditionSelector.Visible = false;
                    cbLogicSelector.Visible = false;
                    break;

                case 1:
                    cbTriggerSignalSelector.SetBounds(dgvTrigger.Location.X + rect.X, dgvTrigger.Location.Y + rect.Y, rect.Width, rect.Height);
                    cbTriggerSignalSelector.Visible = true;
                    cbConditionSelector.Visible = false;
                    cbLogicSelector.Visible = false;
                    break;

                case 3:
                    cbConditionSelector.SetBounds(dgvTrigger.Location.X + rect.X, dgvTrigger.Location.Y + rect.Y, rect.Width, rect.Height);
                    cbConditionSelector.Visible = true;
                    cbTriggerSignalSelector.Visible = false;
                    cbLogicSelector.Visible = false;
                    break;

                case 5:
                    cbLogicSelector.SetBounds(dgvTrigger.Location.X + rect.X, dgvTrigger.Location.Y + rect.Y, rect.Width, rect.Height);
                    cbLogicSelector.Visible = true;
                    cbTriggerSignalSelector.Visible = false;
                    cbConditionSelector.Visible = false;
                    break;

                default:
                    cbTriggerSignalSelector.Visible = false;
                    cbConditionSelector.Visible = false;
                    cbLogicSelector.Visible = false;
                    break;
            }

        }


        /// <summary>
        /// Datagrid cell leave handler to check the validity of the column 4 entry. If the number cannot be converted, the cell stays selected.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void dgvTrigger_CellLeave(object sender, DataGridViewCellEventArgs e)
        {
            if (e.ColumnIndex == 4)
            {
                try
                {
                    if (ConvertUInt64(dgvTrigger.Rows[e.RowIndex].Cells[e.ColumnIndex]) == DEFAULT_RETURN_UINT64)
                        dgvTrigger.Rows[e.RowIndex].Cells[e.ColumnIndex].Selected = true;
                }
                catch
                {
                    dgvTrigger.Rows[e.RowIndex].Cells[e.ColumnIndex].Selected = true;
                }
            }
        }

        /// <summary>
        /// ComboBox index change handler to update the signal selection of the cell.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void cbTriggerSignalSelector_SelectedIndexChanged(object sender, EventArgs e)
        {
            currentCell.Value = cbTriggerSignalSelector.Items[cbTriggerSignalSelector.SelectedIndex].ToString();
            dgvTrigger.Rows[currentCell.RowIndex].Cells[2].Value = TriggerBits[cbTriggerSignalSelector.SelectedIndex];
            cbTriggerSignalSelector.Visible = false;
            currentCell = null;
        }


        /// <summary>
        /// ComboBox index change handler to update the condition selection of the cell.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void cbConditionSelector_SelectedIndexChanged(object sender, EventArgs e)
        {
            currentCell.Value = cbConditionSelector.Text;
            cbConditionSelector.Visible = false;
            currentCell = null;
        }

        /// <summary>
        /// ComboBox index change handler to update the logic selection of the cell.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void cbLogicSelector_SelectedIndexChanged(object sender, EventArgs e)
        {
            currentCell.Value = cbLogicSelector.Text;
            cbLogicSelector.Visible = false;
            currentCell = null;
        }

        /// <summary>
        /// Convert the condition string into enumeration value.
        /// </summary>
        /// <param name="CondStr">Condition string to convert.</param>
        /// <returns>Trigger.CompareCondition that matches.</returns>
        private Trigger.CompareCondition MatchCond(string CondStr)
        {
            for (int i = 0; i < Trigger.CondStr.Length; i++)
            {
                if (Trigger.CondStr[i] == CondStr)
                    return (Trigger.CompareCondition)i;
            }
            return Trigger.CompareCondition.X;
        }

        /// <summary>
        /// Convert the logic string into enumeration value.
        /// </summary>
        /// <param name="CondStr">Logic string to convert.</param>
        /// <returns>Trigger.LogicOp that matches.</returns>
        private Trigger.LogicOp MatchLogic(string LogicStr)
        {
            for (int i = 0; i < Trigger.LogicStr.Length; i++)
            {
                if (Trigger.LogicStr[i] == LogicStr)
                    return (Trigger.LogicOp)i;
            }
            return Trigger.LogicOp.OR;
        }


        /// <summary>
        /// Convert the grid information into list of pulse objects.
        /// </summary>
        /// <returns>List of pulse objects converted from the data grid view cells.</returns>
        public List<Stimulus> GetStimuli()
        {
            List<Stimulus> result = new List<Stimulus>();
            for (int i = 0; i < dgvStimulus.Rows.Count; i++)
            {
                if (dgvStimulus.Rows[i].Cells[1].Value.ToString() == "")
                    break;

                try
                {
                    result.Add(new Stimulus(dgvStimulus.Rows[i].Cells[1].Value.ToString(),
                        Convert.ToInt32(dgvStimulus.Rows[i].Cells[2].Value),
                        MatchOutput(dgvStimulus.Rows[i].Cells[3].Value.ToString()),
                        ConvertUInt64(dgvStimulus.Rows[i].Cells[4]),
                        dgvStimulus.Rows[i].Cells[4].Value.ToString(),
                        ConvertDouble(dgvStimulus.Rows[i].Cells[5]),
                        dgvStimulus.Rows[i].Cells[5].Value.ToString(),
                        ConvertDouble(dgvStimulus.Rows[i].Cells[6]),
                        dgvStimulus.Rows[i].Cells[6].Value.ToString()));
                }
                catch { }
            }
            return result;
        }

        /// <summary>
        /// Convert the grid information into list of trigger objects.
        /// </summary>
        /// <returns>List of trigger objects converted from the data grid view cells.</returns>
        public List<Trigger> GetTriggers()
        {
            List<Trigger> result = new List<Trigger>();
            for (int i = 0; i < dgvTrigger.Rows.Count; i++)
            {
                if (dgvTrigger.Rows[i].Cells[1].Value.ToString() == "")
                    break;

                try
                {
                    string name = dgvTrigger.Rows[i].Cells[1].Value.ToString();
                    DisplaySignal ds = main.CreateLinkedDisplaySignal(name);
                    int bits = Convert.ToInt32(dgvTrigger.Rows[i].Cells[2].Value.ToString());
                    Trigger.CompareCondition cond = MatchCond(dgvTrigger.Rows[i].Cells[3].Value.ToString());
                    UInt64 compareValue = ConvertUInt64(dgvTrigger.Rows[i].Cells[4]);
                    string compareValueStr = dgvTrigger.Rows[i].Cells[4].Value.ToString();
                    Trigger.LogicOp logicOp = MatchLogic(dgvTrigger.Rows[i].Cells[5].Value.ToString());
                    Trigger trg = new Trigger(name, bits, cond, compareValue, compareValueStr, logicOp, ds.Element, ds.Pins);
                    result.Add(trg);
                }
                catch { }
            }
            return result;
        }

        /// <summary>
        /// Gets or sets the SimulationInterval of the form.
        /// </summary>
        public double SimulationInterval
        {
            get { return (double)nudSimulationInterval.Value; }
            set { nudSimulationInterval.Value = (decimal)value; }
        }

        /// <summary>
        /// Gets or sets the SimulationMaxTime of the form.
        /// </summary>
        public double SimulationMaxTime
        {
            get { return (double)nudSimulationMaxTime.Value; }
            set { nudSimulationMaxTime.Value = (decimal)value; }
        }

        /// <summary>
        /// Gets or sets the SimulationContinueTime of the form.
        /// </summary>
        public double SimulationContinueTime
        {
            get { return (double)nudSimulationContinueTime.Value; }
            set { nudSimulationContinueTime.Value = (decimal)value; }
        }

        /// <summary>
        /// Gets or sets the TriggerEnable of the form.
        /// </summary>
        public bool EnableTrigger
        {
            get { return ckbEnableTrigger.Checked; }
            set { ckbEnableTrigger.Checked = value; }
        }

        /// <summary>
        /// Gets or sets the TriggerPosition of the form.
        /// </summary>
        public double TriggerPosition
        {
            get { return (double)nudTriggerPosition.Value; }
            set { nudTriggerPosition.Value = (decimal)value; }
        }

 
    }
}
