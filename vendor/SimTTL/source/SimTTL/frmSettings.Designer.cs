namespace SimTTL
{
    partial class frmSettings
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.pnControl = new System.Windows.Forms.Panel();
            this.btnCancel = new System.Windows.Forms.Button();
            this.btnOK = new System.Windows.Forms.Button();
            this.label1 = new System.Windows.Forms.Label();
            this.nudSimulationMaxTime = new System.Windows.Forms.NumericUpDown();
            this.nudSimulationInterval = new System.Windows.Forms.NumericUpDown();
            this.label2 = new System.Windows.Forms.Label();
            this.label3 = new System.Windows.Forms.Label();
            this.label4 = new System.Windows.Forms.Label();
            this.dgvTrigger = new System.Windows.Forms.DataGridView();
            this.idxDataGridViewTextBoxColumn = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.signalDataGridViewTextBoxColumn = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.bitsDataGridViewTextBoxColumn1 = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.conditionDataGridViewTextBoxColumn = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.valueDataGridViewTextBoxColumn = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.logicDataGridViewTextBoxColumn = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.dsTables = new System.Data.DataSet();
            this.dtStimulus = new System.Data.DataTable();
            this.dcStimulusIdx = new System.Data.DataColumn();
            this.dcStimulusSignal = new System.Data.DataColumn();
            this.dcStimulusBits = new System.Data.DataColumn();
            this.dcStimulusOutput = new System.Data.DataColumn();
            this.dcStimulusValue = new System.Data.DataColumn();
            this.dcStimulusTime = new System.Data.DataColumn();
            this.dcStimulusDuration = new System.Data.DataColumn();
            this.dtTrigger = new System.Data.DataTable();
            this.dcTriggerIdx = new System.Data.DataColumn();
            this.dcTriggerSignal = new System.Data.DataColumn();
            this.dcTriggerBits = new System.Data.DataColumn();
            this.dcTriggerCondition = new System.Data.DataColumn();
            this.dcTriggerValue = new System.Data.DataColumn();
            this.dcTriggerLogic = new System.Data.DataColumn();
            this.ckbEnableTrigger = new System.Windows.Forms.CheckBox();
            this.cbTriggerSignalSelector = new System.Windows.Forms.ComboBox();
            this.cbConditionSelector = new System.Windows.Forms.ComboBox();
            this.cbLogicSelector = new System.Windows.Forms.ComboBox();
            this.label5 = new System.Windows.Forms.Label();
            this.nudTriggerPosition = new System.Windows.Forms.NumericUpDown();
            this.label6 = new System.Windows.Forms.Label();
            this.dgvStimulus = new System.Windows.Forms.DataGridView();
            this.idxDataGridViewTextBoxColumn2 = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.signalDataGridViewTextBoxColumn2 = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.bitsDataGridViewTextBoxColumn = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.dataGridViewTextBoxColumn1 = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.valueDataGridViewTextBoxColumn2 = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.dataGridViewTextBoxColumn2 = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.dataGridViewTextBoxColumn3 = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.cbOutput = new System.Windows.Forms.ComboBox();
            this.label7 = new System.Windows.Forms.Label();
            this.label8 = new System.Windows.Forms.Label();
            this.cbStimulusSignalSelector = new System.Windows.Forms.ComboBox();
            this.label9 = new System.Windows.Forms.Label();
            this.nudSimulationContinueTime = new System.Windows.Forms.NumericUpDown();
            this.label10 = new System.Windows.Forms.Label();
            this.pnTop = new System.Windows.Forms.Panel();
            this.panel5 = new System.Windows.Forms.Panel();
            this.panel2 = new System.Windows.Forms.Panel();
            this.pnBottom = new System.Windows.Forms.Panel();
            this.panel6 = new System.Windows.Forms.Panel();
            this.panel4 = new System.Windows.Forms.Panel();
            this.splitter1 = new System.Windows.Forms.Splitter();
            this.pnControl.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.nudSimulationMaxTime)).BeginInit();
            ((System.ComponentModel.ISupportInitialize)(this.nudSimulationInterval)).BeginInit();
            ((System.ComponentModel.ISupportInitialize)(this.dgvTrigger)).BeginInit();
            ((System.ComponentModel.ISupportInitialize)(this.dsTables)).BeginInit();
            ((System.ComponentModel.ISupportInitialize)(this.dtStimulus)).BeginInit();
            ((System.ComponentModel.ISupportInitialize)(this.dtTrigger)).BeginInit();
            ((System.ComponentModel.ISupportInitialize)(this.nudTriggerPosition)).BeginInit();
            ((System.ComponentModel.ISupportInitialize)(this.dgvStimulus)).BeginInit();
            ((System.ComponentModel.ISupportInitialize)(this.nudSimulationContinueTime)).BeginInit();
            this.pnTop.SuspendLayout();
            this.panel5.SuspendLayout();
            this.panel2.SuspendLayout();
            this.pnBottom.SuspendLayout();
            this.panel6.SuspendLayout();
            this.panel4.SuspendLayout();
            this.SuspendLayout();
            // 
            // pnControl
            // 
            this.pnControl.Controls.Add(this.btnCancel);
            this.pnControl.Controls.Add(this.btnOK);
            this.pnControl.Dock = System.Windows.Forms.DockStyle.Bottom;
            this.pnControl.Location = new System.Drawing.Point(0, 677);
            this.pnControl.Name = "pnControl";
            this.pnControl.Size = new System.Drawing.Size(828, 45);
            this.pnControl.TabIndex = 0;
            // 
            // btnCancel
            // 
            this.btnCancel.DialogResult = System.Windows.Forms.DialogResult.Cancel;
            this.btnCancel.Location = new System.Drawing.Point(460, 10);
            this.btnCancel.Name = "btnCancel";
            this.btnCancel.Size = new System.Drawing.Size(75, 23);
            this.btnCancel.TabIndex = 1;
            this.btnCancel.Text = "Cancel";
            this.btnCancel.UseVisualStyleBackColor = true;
            // 
            // btnOK
            // 
            this.btnOK.DialogResult = System.Windows.Forms.DialogResult.OK;
            this.btnOK.Location = new System.Drawing.Point(290, 10);
            this.btnOK.Name = "btnOK";
            this.btnOK.Size = new System.Drawing.Size(75, 23);
            this.btnOK.TabIndex = 0;
            this.btnOK.Text = "OK";
            this.btnOK.UseVisualStyleBackColor = true;
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(432, 12);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(126, 13);
            this.label1.TabIndex = 1;
            this.label1.Text = "Simulation Time Window:";
            // 
            // nudSimulationMaxTime
            // 
            this.nudSimulationMaxTime.Location = new System.Drawing.Point(570, 10);
            this.nudSimulationMaxTime.Maximum = new decimal(new int[] {
            1000000000,
            0,
            0,
            0});
            this.nudSimulationMaxTime.Name = "nudSimulationMaxTime";
            this.nudSimulationMaxTime.Size = new System.Drawing.Size(120, 20);
            this.nudSimulationMaxTime.TabIndex = 2;
            // 
            // nudSimulationInterval
            // 
            this.nudSimulationInterval.Location = new System.Drawing.Point(182, 10);
            this.nudSimulationInterval.Maximum = new decimal(new int[] {
            1000,
            0,
            0,
            0});
            this.nudSimulationInterval.Name = "nudSimulationInterval";
            this.nudSimulationInterval.Size = new System.Drawing.Size(120, 20);
            this.nudSimulationInterval.TabIndex = 4;
            // 
            // label2
            // 
            this.label2.AutoSize = true;
            this.label2.Location = new System.Drawing.Point(48, 12);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(109, 13);
            this.label2.TabIndex = 3;
            this.label2.Text = "Simulation Time Step:";
            // 
            // label3
            // 
            this.label3.AutoSize = true;
            this.label3.Location = new System.Drawing.Point(311, 12);
            this.label3.Name = "label3";
            this.label3.Size = new System.Drawing.Size(18, 13);
            this.label3.TabIndex = 5;
            this.label3.Text = "ns";
            // 
            // label4
            // 
            this.label4.AutoSize = true;
            this.label4.Location = new System.Drawing.Point(699, 12);
            this.label4.Name = "label4";
            this.label4.Size = new System.Drawing.Size(18, 13);
            this.label4.TabIndex = 6;
            this.label4.Text = "ns";
            // 
            // dgvTrigger
            // 
            this.dgvTrigger.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.dgvTrigger.AutoGenerateColumns = false;
            this.dgvTrigger.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            this.dgvTrigger.Columns.AddRange(new System.Windows.Forms.DataGridViewColumn[] {
            this.idxDataGridViewTextBoxColumn,
            this.signalDataGridViewTextBoxColumn,
            this.bitsDataGridViewTextBoxColumn1,
            this.conditionDataGridViewTextBoxColumn,
            this.valueDataGridViewTextBoxColumn,
            this.logicDataGridViewTextBoxColumn});
            this.dgvTrigger.DataMember = "dtTrigger";
            this.dgvTrigger.DataSource = this.dsTables;
            this.dgvTrigger.Location = new System.Drawing.Point(8, 0);
            this.dgvTrigger.Name = "dgvTrigger";
            this.dgvTrigger.RowHeadersVisible = false;
            this.dgvTrigger.Size = new System.Drawing.Size(811, 288);
            this.dgvTrigger.TabIndex = 7;
            this.dgvTrigger.CellClick += new System.Windows.Forms.DataGridViewCellEventHandler(this.dgvTrigger_CellClick);
            this.dgvTrigger.CellLeave += new System.Windows.Forms.DataGridViewCellEventHandler(this.dgvTrigger_CellLeave);
            // 
            // idxDataGridViewTextBoxColumn
            // 
            this.idxDataGridViewTextBoxColumn.DataPropertyName = "Idx";
            this.idxDataGridViewTextBoxColumn.HeaderText = "Idx";
            this.idxDataGridViewTextBoxColumn.Name = "idxDataGridViewTextBoxColumn";
            this.idxDataGridViewTextBoxColumn.Width = 40;
            // 
            // signalDataGridViewTextBoxColumn
            // 
            this.signalDataGridViewTextBoxColumn.DataPropertyName = "Signal";
            this.signalDataGridViewTextBoxColumn.HeaderText = "Signal";
            this.signalDataGridViewTextBoxColumn.Name = "signalDataGridViewTextBoxColumn";
            this.signalDataGridViewTextBoxColumn.Width = 300;
            // 
            // bitsDataGridViewTextBoxColumn1
            // 
            this.bitsDataGridViewTextBoxColumn1.DataPropertyName = "Bits";
            this.bitsDataGridViewTextBoxColumn1.HeaderText = "Bits";
            this.bitsDataGridViewTextBoxColumn1.Name = "bitsDataGridViewTextBoxColumn1";
            this.bitsDataGridViewTextBoxColumn1.ReadOnly = true;
            this.bitsDataGridViewTextBoxColumn1.Width = 40;
            // 
            // conditionDataGridViewTextBoxColumn
            // 
            this.conditionDataGridViewTextBoxColumn.DataPropertyName = "Condition";
            this.conditionDataGridViewTextBoxColumn.HeaderText = "Condition";
            this.conditionDataGridViewTextBoxColumn.Name = "conditionDataGridViewTextBoxColumn";
            // 
            // valueDataGridViewTextBoxColumn
            // 
            this.valueDataGridViewTextBoxColumn.DataPropertyName = "Value";
            this.valueDataGridViewTextBoxColumn.HeaderText = "Value";
            this.valueDataGridViewTextBoxColumn.Name = "valueDataGridViewTextBoxColumn";
            this.valueDataGridViewTextBoxColumn.Width = 200;
            // 
            // logicDataGridViewTextBoxColumn
            // 
            this.logicDataGridViewTextBoxColumn.DataPropertyName = "Logic";
            this.logicDataGridViewTextBoxColumn.HeaderText = "Logic";
            this.logicDataGridViewTextBoxColumn.Name = "logicDataGridViewTextBoxColumn";
            // 
            // dsTables
            // 
            this.dsTables.DataSetName = "NewDataSet";
            this.dsTables.Tables.AddRange(new System.Data.DataTable[] {
            this.dtStimulus,
            this.dtTrigger});
            // 
            // dtStimulus
            // 
            this.dtStimulus.Columns.AddRange(new System.Data.DataColumn[] {
            this.dcStimulusIdx,
            this.dcStimulusSignal,
            this.dcStimulusBits,
            this.dcStimulusOutput,
            this.dcStimulusValue,
            this.dcStimulusTime,
            this.dcStimulusDuration});
            this.dtStimulus.TableName = "dtStimulus";
            // 
            // dcStimulusIdx
            // 
            this.dcStimulusIdx.ColumnName = "Idx";
            // 
            // dcStimulusSignal
            // 
            this.dcStimulusSignal.ColumnName = "Signal";
            // 
            // dcStimulusBits
            // 
            this.dcStimulusBits.ColumnName = "Bits";
            // 
            // dcStimulusOutput
            // 
            this.dcStimulusOutput.ColumnName = "Output Type";
            // 
            // dcStimulusValue
            // 
            this.dcStimulusValue.ColumnName = "Value";
            // 
            // dcStimulusTime
            // 
            this.dcStimulusTime.ColumnName = "Time";
            // 
            // dcStimulusDuration
            // 
            this.dcStimulusDuration.ColumnName = "Duration";
            // 
            // dtTrigger
            // 
            this.dtTrigger.Columns.AddRange(new System.Data.DataColumn[] {
            this.dcTriggerIdx,
            this.dcTriggerSignal,
            this.dcTriggerBits,
            this.dcTriggerCondition,
            this.dcTriggerValue,
            this.dcTriggerLogic});
            this.dtTrigger.TableName = "dtTrigger";
            // 
            // dcTriggerIdx
            // 
            this.dcTriggerIdx.Caption = "Idx";
            this.dcTriggerIdx.ColumnName = "Idx";
            // 
            // dcTriggerSignal
            // 
            this.dcTriggerSignal.ColumnName = "Signal";
            // 
            // dcTriggerBits
            // 
            this.dcTriggerBits.ColumnName = "Bits";
            // 
            // dcTriggerCondition
            // 
            this.dcTriggerCondition.ColumnName = "Condition";
            // 
            // dcTriggerValue
            // 
            this.dcTriggerValue.ColumnName = "Value";
            // 
            // dcTriggerLogic
            // 
            this.dcTriggerLogic.ColumnName = "Logic";
            // 
            // ckbEnableTrigger
            // 
            this.ckbEnableTrigger.AutoSize = true;
            this.ckbEnableTrigger.Location = new System.Drawing.Point(182, 16);
            this.ckbEnableTrigger.Name = "ckbEnableTrigger";
            this.ckbEnableTrigger.Size = new System.Drawing.Size(95, 17);
            this.ckbEnableTrigger.TabIndex = 8;
            this.ckbEnableTrigger.Text = "Enable Trigger";
            this.ckbEnableTrigger.UseVisualStyleBackColor = true;
            // 
            // cbTriggerSignalSelector
            // 
            this.cbTriggerSignalSelector.FormattingEnabled = true;
            this.cbTriggerSignalSelector.Location = new System.Drawing.Point(52, 25);
            this.cbTriggerSignalSelector.Name = "cbTriggerSignalSelector";
            this.cbTriggerSignalSelector.Size = new System.Drawing.Size(299, 21);
            this.cbTriggerSignalSelector.TabIndex = 9;
            this.cbTriggerSignalSelector.Visible = false;
            this.cbTriggerSignalSelector.SelectedIndexChanged += new System.EventHandler(this.cbTriggerSignalSelector_SelectedIndexChanged);
            // 
            // cbConditionSelector
            // 
            this.cbConditionSelector.FormattingEnabled = true;
            this.cbConditionSelector.Location = new System.Drawing.Point(387, 25);
            this.cbConditionSelector.Name = "cbConditionSelector";
            this.cbConditionSelector.Size = new System.Drawing.Size(104, 21);
            this.cbConditionSelector.TabIndex = 10;
            this.cbConditionSelector.Visible = false;
            this.cbConditionSelector.SelectedIndexChanged += new System.EventHandler(this.cbConditionSelector_SelectedIndexChanged);
            // 
            // cbLogicSelector
            // 
            this.cbLogicSelector.FormattingEnabled = true;
            this.cbLogicSelector.Location = new System.Drawing.Point(690, 25);
            this.cbLogicSelector.Name = "cbLogicSelector";
            this.cbLogicSelector.Size = new System.Drawing.Size(98, 21);
            this.cbLogicSelector.TabIndex = 11;
            this.cbLogicSelector.Visible = false;
            this.cbLogicSelector.SelectedIndexChanged += new System.EventHandler(this.cbLogicSelector_SelectedIndexChanged);
            // 
            // label5
            // 
            this.label5.AutoSize = true;
            this.label5.Location = new System.Drawing.Point(699, 17);
            this.label5.Name = "label5";
            this.label5.Size = new System.Drawing.Size(18, 13);
            this.label5.TabIndex = 14;
            this.label5.Text = "ns";
            // 
            // nudTriggerPosition
            // 
            this.nudTriggerPosition.Location = new System.Drawing.Point(570, 15);
            this.nudTriggerPosition.Maximum = new decimal(new int[] {
            1000000000,
            0,
            0,
            0});
            this.nudTriggerPosition.Name = "nudTriggerPosition";
            this.nudTriggerPosition.Size = new System.Drawing.Size(120, 20);
            this.nudTriggerPosition.TabIndex = 13;
            // 
            // label6
            // 
            this.label6.AutoSize = true;
            this.label6.Location = new System.Drawing.Point(432, 17);
            this.label6.Name = "label6";
            this.label6.Size = new System.Drawing.Size(136, 13);
            this.label6.TabIndex = 12;
            this.label6.Text = "Trigger Position in Window:";
            // 
            // dgvStimulus
            // 
            this.dgvStimulus.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.dgvStimulus.AutoGenerateColumns = false;
            this.dgvStimulus.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            this.dgvStimulus.Columns.AddRange(new System.Windows.Forms.DataGridViewColumn[] {
            this.idxDataGridViewTextBoxColumn2,
            this.signalDataGridViewTextBoxColumn2,
            this.bitsDataGridViewTextBoxColumn,
            this.dataGridViewTextBoxColumn1,
            this.valueDataGridViewTextBoxColumn2,
            this.dataGridViewTextBoxColumn2,
            this.dataGridViewTextBoxColumn3});
            this.dgvStimulus.DataMember = "dtStimulus";
            this.dgvStimulus.DataSource = this.dsTables;
            this.dgvStimulus.Location = new System.Drawing.Point(8, 0);
            this.dgvStimulus.Name = "dgvStimulus";
            this.dgvStimulus.RowHeadersVisible = false;
            this.dgvStimulus.Size = new System.Drawing.Size(811, 279);
            this.dgvStimulus.TabIndex = 15;
            this.dgvStimulus.CellClick += new System.Windows.Forms.DataGridViewCellEventHandler(this.dgvStimulus_CellClick);
            this.dgvStimulus.CellLeave += new System.Windows.Forms.DataGridViewCellEventHandler(this.dgvStimulus_CellLeave);
            // 
            // idxDataGridViewTextBoxColumn2
            // 
            this.idxDataGridViewTextBoxColumn2.DataPropertyName = "Idx";
            this.idxDataGridViewTextBoxColumn2.HeaderText = "Idx";
            this.idxDataGridViewTextBoxColumn2.Name = "idxDataGridViewTextBoxColumn2";
            this.idxDataGridViewTextBoxColumn2.Width = 40;
            // 
            // signalDataGridViewTextBoxColumn2
            // 
            this.signalDataGridViewTextBoxColumn2.DataPropertyName = "Signal";
            this.signalDataGridViewTextBoxColumn2.HeaderText = "Signal";
            this.signalDataGridViewTextBoxColumn2.Name = "signalDataGridViewTextBoxColumn2";
            this.signalDataGridViewTextBoxColumn2.Width = 300;
            // 
            // bitsDataGridViewTextBoxColumn
            // 
            this.bitsDataGridViewTextBoxColumn.DataPropertyName = "Bits";
            this.bitsDataGridViewTextBoxColumn.HeaderText = "Bits";
            this.bitsDataGridViewTextBoxColumn.Name = "bitsDataGridViewTextBoxColumn";
            this.bitsDataGridViewTextBoxColumn.ReadOnly = true;
            this.bitsDataGridViewTextBoxColumn.Width = 40;
            // 
            // dataGridViewTextBoxColumn1
            // 
            this.dataGridViewTextBoxColumn1.DataPropertyName = "Output Type";
            this.dataGridViewTextBoxColumn1.HeaderText = "Output Type";
            this.dataGridViewTextBoxColumn1.Name = "dataGridViewTextBoxColumn1";
            // 
            // valueDataGridViewTextBoxColumn2
            // 
            this.valueDataGridViewTextBoxColumn2.DataPropertyName = "Value";
            this.valueDataGridViewTextBoxColumn2.HeaderText = "Value";
            this.valueDataGridViewTextBoxColumn2.Name = "valueDataGridViewTextBoxColumn2";
            // 
            // dataGridViewTextBoxColumn2
            // 
            this.dataGridViewTextBoxColumn2.DataPropertyName = "Time";
            this.dataGridViewTextBoxColumn2.HeaderText = "Time";
            this.dataGridViewTextBoxColumn2.Name = "dataGridViewTextBoxColumn2";
            // 
            // dataGridViewTextBoxColumn3
            // 
            this.dataGridViewTextBoxColumn3.DataPropertyName = "Duration";
            this.dataGridViewTextBoxColumn3.HeaderText = "Duration";
            this.dataGridViewTextBoxColumn3.Name = "dataGridViewTextBoxColumn3";
            // 
            // cbOutput
            // 
            this.cbOutput.FormattingEnabled = true;
            this.cbOutput.Location = new System.Drawing.Point(387, 32);
            this.cbOutput.Name = "cbOutput";
            this.cbOutput.Size = new System.Drawing.Size(103, 21);
            this.cbOutput.TabIndex = 16;
            this.cbOutput.Visible = false;
            this.cbOutput.SelectedIndexChanged += new System.EventHandler(this.cbOutput_SelectedIndexChanged);
            // 
            // label7
            // 
            this.label7.AutoSize = true;
            this.label7.Location = new System.Drawing.Point(12, 46);
            this.label7.Name = "label7";
            this.label7.Size = new System.Drawing.Size(120, 13);
            this.label7.TabIndex = 18;
            this.label7.Text = "Input Signal Stimulation:";
            // 
            // label8
            // 
            this.label8.AutoSize = true;
            this.label8.Location = new System.Drawing.Point(11, 25);
            this.label8.Name = "label8";
            this.label8.Size = new System.Drawing.Size(95, 13);
            this.label8.TabIndex = 19;
            this.label8.Text = "Trigger Conditions:";
            // 
            // cbStimulusSignalSelector
            // 
            this.cbStimulusSignalSelector.FormattingEnabled = true;
            this.cbStimulusSignalSelector.Location = new System.Drawing.Point(49, 32);
            this.cbStimulusSignalSelector.Name = "cbStimulusSignalSelector";
            this.cbStimulusSignalSelector.Size = new System.Drawing.Size(299, 21);
            this.cbStimulusSignalSelector.TabIndex = 20;
            this.cbStimulusSignalSelector.Visible = false;
            this.cbStimulusSignalSelector.SelectedIndexChanged += new System.EventHandler(this.cbStimulusSignalSelector_SelectedIndexChanged);
            // 
            // label9
            // 
            this.label9.AutoSize = true;
            this.label9.Location = new System.Drawing.Point(699, 38);
            this.label9.Name = "label9";
            this.label9.Size = new System.Drawing.Size(18, 13);
            this.label9.TabIndex = 23;
            this.label9.Text = "ns";
            // 
            // nudSimulationContinueTime
            // 
            this.nudSimulationContinueTime.Location = new System.Drawing.Point(570, 36);
            this.nudSimulationContinueTime.Maximum = new decimal(new int[] {
            1000000000,
            0,
            0,
            0});
            this.nudSimulationContinueTime.Name = "nudSimulationContinueTime";
            this.nudSimulationContinueTime.Size = new System.Drawing.Size(120, 20);
            this.nudSimulationContinueTime.TabIndex = 22;
            // 
            // label10
            // 
            this.label10.AutoSize = true;
            this.label10.Location = new System.Drawing.Point(432, 38);
            this.label10.Name = "label10";
            this.label10.Size = new System.Drawing.Size(116, 13);
            this.label10.TabIndex = 21;
            this.label10.Text = "Continue Time Interval:";
            // 
            // pnTop
            // 
            this.pnTop.Controls.Add(this.panel5);
            this.pnTop.Controls.Add(this.panel2);
            this.pnTop.Dock = System.Windows.Forms.DockStyle.Top;
            this.pnTop.Location = new System.Drawing.Point(0, 0);
            this.pnTop.Name = "pnTop";
            this.pnTop.Size = new System.Drawing.Size(828, 345);
            this.pnTop.TabIndex = 25;
            // 
            // panel5
            // 
            this.panel5.Controls.Add(this.cbOutput);
            this.panel5.Controls.Add(this.cbStimulusSignalSelector);
            this.panel5.Controls.Add(this.dgvStimulus);
            this.panel5.Dock = System.Windows.Forms.DockStyle.Fill;
            this.panel5.Location = new System.Drawing.Point(0, 66);
            this.panel5.Name = "panel5";
            this.panel5.Size = new System.Drawing.Size(828, 279);
            this.panel5.TabIndex = 26;
            // 
            // panel2
            // 
            this.panel2.Controls.Add(this.label1);
            this.panel2.Controls.Add(this.label7);
            this.panel2.Controls.Add(this.label4);
            this.panel2.Controls.Add(this.label3);
            this.panel2.Controls.Add(this.label9);
            this.panel2.Controls.Add(this.nudSimulationInterval);
            this.panel2.Controls.Add(this.nudSimulationMaxTime);
            this.panel2.Controls.Add(this.label10);
            this.panel2.Controls.Add(this.nudSimulationContinueTime);
            this.panel2.Controls.Add(this.label2);
            this.panel2.Dock = System.Windows.Forms.DockStyle.Top;
            this.panel2.Location = new System.Drawing.Point(0, 0);
            this.panel2.Name = "panel2";
            this.panel2.Size = new System.Drawing.Size(828, 66);
            this.panel2.TabIndex = 25;
            // 
            // pnBottom
            // 
            this.pnBottom.Controls.Add(this.panel6);
            this.pnBottom.Controls.Add(this.panel4);
            this.pnBottom.Dock = System.Windows.Forms.DockStyle.Fill;
            this.pnBottom.Location = new System.Drawing.Point(0, 345);
            this.pnBottom.Name = "pnBottom";
            this.pnBottom.Size = new System.Drawing.Size(828, 332);
            this.pnBottom.TabIndex = 26;
            // 
            // panel6
            // 
            this.panel6.Controls.Add(this.cbConditionSelector);
            this.panel6.Controls.Add(this.cbLogicSelector);
            this.panel6.Controls.Add(this.cbTriggerSignalSelector);
            this.panel6.Controls.Add(this.dgvTrigger);
            this.panel6.Dock = System.Windows.Forms.DockStyle.Fill;
            this.panel6.Location = new System.Drawing.Point(0, 44);
            this.panel6.Name = "panel6";
            this.panel6.Size = new System.Drawing.Size(828, 288);
            this.panel6.TabIndex = 21;
            // 
            // panel4
            // 
            this.panel4.Controls.Add(this.nudTriggerPosition);
            this.panel4.Controls.Add(this.ckbEnableTrigger);
            this.panel4.Controls.Add(this.label6);
            this.panel4.Controls.Add(this.label5);
            this.panel4.Controls.Add(this.label8);
            this.panel4.Dock = System.Windows.Forms.DockStyle.Top;
            this.panel4.Location = new System.Drawing.Point(0, 0);
            this.panel4.Name = "panel4";
            this.panel4.Size = new System.Drawing.Size(828, 44);
            this.panel4.TabIndex = 20;
            // 
            // splitter1
            // 
            this.splitter1.Dock = System.Windows.Forms.DockStyle.Top;
            this.splitter1.Location = new System.Drawing.Point(0, 345);
            this.splitter1.Name = "splitter1";
            this.splitter1.Size = new System.Drawing.Size(828, 3);
            this.splitter1.TabIndex = 27;
            this.splitter1.TabStop = false;
            // 
            // frmSettings
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(828, 722);
            this.Controls.Add(this.splitter1);
            this.Controls.Add(this.pnBottom);
            this.Controls.Add(this.pnTop);
            this.Controls.Add(this.pnControl);
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.SizableToolWindow;
            this.Name = "frmSettings";
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterParent;
            this.Text = "Settings";
            this.Shown += new System.EventHandler(this.frmSettings_Shown);
            this.Resize += new System.EventHandler(this.frmSettings_Resize);
            this.pnControl.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.nudSimulationMaxTime)).EndInit();
            ((System.ComponentModel.ISupportInitialize)(this.nudSimulationInterval)).EndInit();
            ((System.ComponentModel.ISupportInitialize)(this.dgvTrigger)).EndInit();
            ((System.ComponentModel.ISupportInitialize)(this.dsTables)).EndInit();
            ((System.ComponentModel.ISupportInitialize)(this.dtStimulus)).EndInit();
            ((System.ComponentModel.ISupportInitialize)(this.dtTrigger)).EndInit();
            ((System.ComponentModel.ISupportInitialize)(this.nudTriggerPosition)).EndInit();
            ((System.ComponentModel.ISupportInitialize)(this.dgvStimulus)).EndInit();
            ((System.ComponentModel.ISupportInitialize)(this.nudSimulationContinueTime)).EndInit();
            this.pnTop.ResumeLayout(false);
            this.panel5.ResumeLayout(false);
            this.panel2.ResumeLayout(false);
            this.panel2.PerformLayout();
            this.pnBottom.ResumeLayout(false);
            this.panel6.ResumeLayout(false);
            this.panel4.ResumeLayout(false);
            this.panel4.PerformLayout();
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.Panel pnControl;
        private System.Windows.Forms.Button btnCancel;
        private System.Windows.Forms.Button btnOK;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.NumericUpDown nudSimulationMaxTime;
        private System.Windows.Forms.NumericUpDown nudSimulationInterval;
        private System.Windows.Forms.Label label2;
        private System.Windows.Forms.Label label3;
        private System.Windows.Forms.Label label4;
        private System.Windows.Forms.DataGridView dgvTrigger;
        private System.Data.DataSet dsTables;
        private System.Data.DataTable dtTrigger;
        private System.Data.DataColumn dcTriggerIdx;
        private System.Data.DataColumn dcTriggerSignal;
        private System.Data.DataColumn dcTriggerCondition;
        private System.Data.DataColumn dcTriggerValue;
        private System.Data.DataColumn dcTriggerLogic;
        private System.Windows.Forms.CheckBox ckbEnableTrigger;
        private System.Windows.Forms.ComboBox cbTriggerSignalSelector;
        private System.Windows.Forms.ComboBox cbConditionSelector;
        private System.Windows.Forms.ComboBox cbLogicSelector;
        private System.Windows.Forms.Label label5;
        private System.Windows.Forms.NumericUpDown nudTriggerPosition;
        private System.Windows.Forms.Label label6;
        private System.Data.DataTable dtStimulus;
        private System.Data.DataColumn dcStimulusIdx;
        private System.Data.DataColumn dcStimulusSignal;
        private System.Data.DataColumn dcStimulusOutput;
        private System.Data.DataColumn dcStimulusValue;
        private System.Data.DataColumn dcStimulusTime;
        private System.Windows.Forms.DataGridView dgvStimulus;
        private System.Data.DataColumn dcStimulusDuration;
        private System.Windows.Forms.ComboBox cbOutput;
        private System.Windows.Forms.Label label7;
        private System.Windows.Forms.Label label8;
        private System.Windows.Forms.DataGridViewTextBoxColumn idxDataGridViewTextBoxColumn1;
        private System.Windows.Forms.DataGridViewTextBoxColumn signalDataGridViewTextBoxColumn1;
        private System.Windows.Forms.DataGridViewTextBoxColumn outputTypeDataGridViewTextBoxColumn;
        private System.Windows.Forms.DataGridViewTextBoxColumn valueDataGridViewTextBoxColumn1;
        private System.Windows.Forms.DataGridViewTextBoxColumn timeDataGridViewTextBoxColumn;
        private System.Windows.Forms.DataGridViewTextBoxColumn durationDataGridViewTextBoxColumn;
        private System.Data.DataColumn dcStimulusBits;
        private System.Windows.Forms.ComboBox cbStimulusSignalSelector;
        private System.Data.DataColumn dcTriggerBits;
        private System.Windows.Forms.DataGridViewTextBoxColumn idxDataGridViewTextBoxColumn2;
        private System.Windows.Forms.DataGridViewTextBoxColumn signalDataGridViewTextBoxColumn2;
        private System.Windows.Forms.DataGridViewTextBoxColumn bitsDataGridViewTextBoxColumn;
        private System.Windows.Forms.DataGridViewTextBoxColumn dataGridViewTextBoxColumn1;
        private System.Windows.Forms.DataGridViewTextBoxColumn valueDataGridViewTextBoxColumn2;
        private System.Windows.Forms.DataGridViewTextBoxColumn dataGridViewTextBoxColumn2;
        private System.Windows.Forms.DataGridViewTextBoxColumn dataGridViewTextBoxColumn3;
        private System.Windows.Forms.DataGridViewTextBoxColumn idxDataGridViewTextBoxColumn;
        private System.Windows.Forms.DataGridViewTextBoxColumn signalDataGridViewTextBoxColumn;
        private System.Windows.Forms.DataGridViewTextBoxColumn bitsDataGridViewTextBoxColumn1;
        private System.Windows.Forms.DataGridViewTextBoxColumn conditionDataGridViewTextBoxColumn;
        private System.Windows.Forms.DataGridViewTextBoxColumn valueDataGridViewTextBoxColumn;
        private System.Windows.Forms.DataGridViewTextBoxColumn logicDataGridViewTextBoxColumn;
        private System.Windows.Forms.Label label9;
        private System.Windows.Forms.NumericUpDown nudSimulationContinueTime;
        private System.Windows.Forms.Label label10;
        private System.Windows.Forms.Panel pnTop;
        private System.Windows.Forms.Panel panel2;
        private System.Windows.Forms.Panel pnBottom;
        private System.Windows.Forms.Panel panel4;
        private System.Windows.Forms.Splitter splitter1;
        private System.Windows.Forms.Panel panel5;
        private System.Windows.Forms.Panel panel6;
    }
}