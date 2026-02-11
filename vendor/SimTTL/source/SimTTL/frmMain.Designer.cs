
namespace SimTTL
{
    partial class frmMain
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
            this.components = new System.ComponentModel.Container();
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(frmMain));
            this.msMainMenu = new System.Windows.Forms.MenuStrip();
            this.tsmiFile = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiLoadSchematics = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiKiCadNetlistImport = new System.Windows.Forms.ToolStripMenuItem();
            this.toolStripMenuItem5 = new System.Windows.Forms.ToolStripSeparator();
            this.toolStripSeparator2 = new System.Windows.Forms.ToolStripSeparator();
            this.tsmiBuiltIn = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiBenEater8BitComputer = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiGigatronTTL = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiTestSchematics = new System.Windows.Forms.ToolStripMenuItem();
            this.toolStripMenuItem6 = new System.Windows.Forms.ToolStripSeparator();
            this.tsmiLoadSimTTLFile = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiSaveSimTTLFile = new System.Windows.Forms.ToolStripMenuItem();
            this.toolStripSeparator1 = new System.Windows.Forms.ToolStripSeparator();
            this.tsmiSaveCurrentSettings = new System.Windows.Forms.ToolStripMenuItem();
            this.toolStripMenuItem1 = new System.Windows.Forms.ToolStripSeparator();
            this.tsmiExportConnections = new System.Windows.Forms.ToolStripMenuItem();
            this.toolStripMenuItem2 = new System.Windows.Forms.ToolStripSeparator();
            this.tsmiPrintSetup = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiPrintView = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiPrintAll = new System.Windows.Forms.ToolStripMenuItem();
            this.toolStripSeparator3 = new System.Windows.Forms.ToolStripSeparator();
            this.tsmiExit = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiEdit = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiExpandAll = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiShowPinNo = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiAutoCloseImportForm = new System.Windows.Forms.ToolStripMenuItem();
            this.toolStripMenuItem7 = new System.Windows.Forms.ToolStripSeparator();
            this.tsmiSearchSignal = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiSimulation = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiSettings = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiSelectSignals = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiRestartSimulation = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiContinueSimulation = new System.Windows.Forms.ToolStripMenuItem();
            this.ssStatus = new System.Windows.Forms.StatusStrip();
            this.tsslSchematicsName = new System.Windows.Forms.ToolStripStatusLabel();
            this.tsslSpace = new System.Windows.Forms.ToolStripStatusLabel();
            this.tsslActivity = new System.Windows.Forms.ToolStripStatusLabel();
            this.tspbProgress = new System.Windows.Forms.ToolStripProgressBar();
            this.tsslTime = new System.Windows.Forms.ToolStripStatusLabel();
            this.pnControl = new System.Windows.Forms.Panel();
            this.label4 = new System.Windows.Forms.Label();
            this.label3 = new System.Windows.Forms.Label();
            this.label2 = new System.Windows.Forms.Label();
            this.label1 = new System.Windows.Forms.Label();
            this.lbMouseCoord = new System.Windows.Forms.Label();
            this.pnSignalNamesBack = new System.Windows.Forms.Panel();
            this.pnSignalNames = new System.Windows.Forms.Panel();
            this.pbSignalNames = new System.Windows.Forms.PictureBox();
            this.pnNameHeader = new System.Windows.Forms.Panel();
            this.lbName = new System.Windows.Forms.Label();
            this.splitter1 = new System.Windows.Forms.Splitter();
            this.pnSignalValuesBack = new System.Windows.Forms.Panel();
            this.pnSignalValues = new System.Windows.Forms.Panel();
            this.pbSignalValues = new System.Windows.Forms.PictureBox();
            this.pnValuesHeader = new System.Windows.Forms.Panel();
            this.lbValue = new System.Windows.Forms.Label();
            this.splitter2 = new System.Windows.Forms.Splitter();
            this.pnSignalGraphs = new System.Windows.Forms.Panel();
            this.pbSignalGraphs = new System.Windows.Forms.PictureBox();
            this.cmsFormat = new System.Windows.Forms.ContextMenuStrip(this.components);
            this.tsmiBinary = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiDecimal = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiSignedDec = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiHexadecimal = new System.Windows.Forms.ToolStripMenuItem();
            this.toolStripMenuItem4 = new System.Windows.Forms.ToolStripSeparator();
            this.tsmiInvert = new System.Windows.Forms.ToolStripMenuItem();
            this.tsmiReverse = new System.Windows.Forms.ToolStripMenuItem();
            this.toolStripMenuItem3 = new System.Windows.Forms.ToolStripSeparator();
            this.tsmiHighlight = new System.Windows.Forms.ToolStripMenuItem();
            this.toolStrip1 = new System.Windows.Forms.ToolStrip();
            this.tsbSettings = new System.Windows.Forms.ToolStripButton();
            this.tsbExpandAll = new System.Windows.Forms.ToolStripButton();
            this.tsbCollapseAll = new System.Windows.Forms.ToolStripButton();
            this.tsbSearch = new System.Windows.Forms.ToolStripButton();
            this.tsbSaveSimTTLFile = new System.Windows.Forms.ToolStripButton();
            this.tsbZoomIn = new System.Windows.Forms.ToolStripButton();
            this.tsbZoomOut = new System.Windows.Forms.ToolStripButton();
            this.tsbZoomFit = new System.Windows.Forms.ToolStripButton();
            this.tsbUnselectAll = new System.Windows.Forms.ToolStripButton();
            this.tsbGotoCursor = new System.Windows.Forms.ToolStripButton();
            this.tsbGotoZero = new System.Windows.Forms.ToolStripButton();
            this.tsbGotoLast = new System.Windows.Forms.ToolStripButton();
            this.tsbPrevTransistion = new System.Windows.Forms.ToolStripButton();
            this.tsbNextTransition = new System.Windows.Forms.ToolStripButton();
            this.tsbAddMarker = new System.Windows.Forms.ToolStripButton();
            this.tsbPrevMarker = new System.Windows.Forms.ToolStripButton();
            this.tsbNextMarker = new System.Windows.Forms.ToolStripButton();
            this.tsbDeleteAllMarkers = new System.Windows.Forms.ToolStripButton();
            this.tsbDeleteSelected = new System.Windows.Forms.ToolStripButton();
            this.pnSignalGraphRuler = new System.Windows.Forms.Panel();
            this.pbSignalGraphRuler = new System.Windows.Forms.PictureBox();
            this.pnLeftHeader = new System.Windows.Forms.Panel();
            this.pnLeft = new System.Windows.Forms.Panel();
            this.ofdKiCadNetlist = new System.Windows.Forms.OpenFileDialog();
            this.ofdSimTTLFile = new System.Windows.Forms.OpenFileDialog();
            this.sfdSimTTLFile = new System.Windows.Forms.SaveFileDialog();
            this.psPrintSetup = new System.Windows.Forms.PageSetupDialog();
            this.pdPrintContents = new System.Windows.Forms.PrintDialog();
            this.msMainMenu.SuspendLayout();
            this.ssStatus.SuspendLayout();
            this.pnControl.SuspendLayout();
            this.pnSignalNamesBack.SuspendLayout();
            this.pnSignalNames.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.pbSignalNames)).BeginInit();
            this.pnNameHeader.SuspendLayout();
            this.pnSignalValuesBack.SuspendLayout();
            this.pnSignalValues.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.pbSignalValues)).BeginInit();
            this.pnValuesHeader.SuspendLayout();
            this.pnSignalGraphs.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.pbSignalGraphs)).BeginInit();
            this.cmsFormat.SuspendLayout();
            this.toolStrip1.SuspendLayout();
            this.pnSignalGraphRuler.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.pbSignalGraphRuler)).BeginInit();
            this.pnLeft.SuspendLayout();
            this.SuspendLayout();
            // 
            // msMainMenu
            // 
            this.msMainMenu.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.tsmiFile,
            this.tsmiEdit,
            this.tsmiSimulation});
            this.msMainMenu.Location = new System.Drawing.Point(0, 0);
            this.msMainMenu.Name = "msMainMenu";
            this.msMainMenu.Size = new System.Drawing.Size(1904, 24);
            this.msMainMenu.TabIndex = 0;
            this.msMainMenu.Text = "menuStrip1";
            // 
            // tsmiFile
            // 
            this.tsmiFile.DropDownItems.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.tsmiLoadSchematics,
            this.toolStripMenuItem6,
            this.tsmiLoadSimTTLFile,
            this.tsmiSaveSimTTLFile,
            this.toolStripSeparator1,
            this.tsmiSaveCurrentSettings,
            this.toolStripMenuItem1,
            this.tsmiExportConnections,
            this.toolStripMenuItem2,
            this.tsmiPrintSetup,
            this.tsmiPrintView,
            this.tsmiPrintAll,
            this.toolStripSeparator3,
            this.tsmiExit});
            this.tsmiFile.Name = "tsmiFile";
            this.tsmiFile.Size = new System.Drawing.Size(37, 20);
            this.tsmiFile.Text = "File";
            // 
            // tsmiLoadSchematics
            // 
            this.tsmiLoadSchematics.DropDownItems.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.tsmiKiCadNetlistImport,
            this.toolStripSeparator2,
            this.tsmiBuiltIn});
            this.tsmiLoadSchematics.Name = "tsmiLoadSchematics";
            this.tsmiLoadSchematics.Size = new System.Drawing.Size(186, 22);
            this.tsmiLoadSchematics.Text = "Load Schematics";
            // 
            // tsmiKiCadNetlistImport
            // 
            this.tsmiKiCadNetlistImport.DropDownItems.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.toolStripMenuItem5});
            this.tsmiKiCadNetlistImport.Name = "tsmiKiCadNetlistImport";
            this.tsmiKiCadNetlistImport.Size = new System.Drawing.Size(181, 22);
            this.tsmiKiCadNetlistImport.Text = "KiCad Netlist Import";
            this.tsmiKiCadNetlistImport.DropDownOpening += new System.EventHandler(this.tsmiKiCadNetlistImport_DropDownOpening);
            this.tsmiKiCadNetlistImport.Click += new System.EventHandler(this.tsmiKiCadNetlistImport_Click);
            // 
            // toolStripMenuItem5
            // 
            this.toolStripMenuItem5.Name = "toolStripMenuItem5";
            this.toolStripMenuItem5.Size = new System.Drawing.Size(57, 6);
            // 
            // toolStripSeparator2
            // 
            this.toolStripSeparator2.Name = "toolStripSeparator2";
            this.toolStripSeparator2.Size = new System.Drawing.Size(178, 6);
            // 
            // tsmiBuiltIn
            // 
            this.tsmiBuiltIn.DropDownItems.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.tsmiBenEater8BitComputer,
            this.tsmiGigatronTTL,
            this.tsmiTestSchematics});
            this.tsmiBuiltIn.Name = "tsmiBuiltIn";
            this.tsmiBuiltIn.Size = new System.Drawing.Size(181, 22);
            this.tsmiBuiltIn.Text = "Built-In";
            // 
            // tsmiBenEater8BitComputer
            // 
            this.tsmiBenEater8BitComputer.Name = "tsmiBenEater8BitComputer";
            this.tsmiBenEater8BitComputer.Size = new System.Drawing.Size(203, 22);
            this.tsmiBenEater8BitComputer.Text = "Ben Eater 8Bit Computer";
            this.tsmiBenEater8BitComputer.Click += new System.EventHandler(this.tsmiBenEater8BitComputer_Click);
            // 
            // tsmiGigatronTTL
            // 
            this.tsmiGigatronTTL.Name = "tsmiGigatronTTL";
            this.tsmiGigatronTTL.Size = new System.Drawing.Size(203, 22);
            this.tsmiGigatronTTL.Text = "Gigatron TTL";
            this.tsmiGigatronTTL.Click += new System.EventHandler(this.tsmiGigatronTTL_Click);
            // 
            // tsmiTestSchematics
            // 
            this.tsmiTestSchematics.Name = "tsmiTestSchematics";
            this.tsmiTestSchematics.Size = new System.Drawing.Size(203, 22);
            this.tsmiTestSchematics.Text = "Test Schematics";
            this.tsmiTestSchematics.Click += new System.EventHandler(this.tsmiTestSchematics_Click);
            // 
            // toolStripMenuItem6
            // 
            this.toolStripMenuItem6.Name = "toolStripMenuItem6";
            this.toolStripMenuItem6.Size = new System.Drawing.Size(183, 6);
            // 
            // tsmiLoadSimTTLFile
            // 
            this.tsmiLoadSimTTLFile.Name = "tsmiLoadSimTTLFile";
            this.tsmiLoadSimTTLFile.Size = new System.Drawing.Size(186, 22);
            this.tsmiLoadSimTTLFile.Text = "Load SimTTLFile";
            this.tsmiLoadSimTTLFile.DropDownOpening += new System.EventHandler(this.tsmiLoadSimTTLFile_DropDownOpening);
            this.tsmiLoadSimTTLFile.Click += new System.EventHandler(this.tsmiLoadSimTTLFile_Click);
            // 
            // tsmiSaveSimTTLFile
            // 
            this.tsmiSaveSimTTLFile.Name = "tsmiSaveSimTTLFile";
            this.tsmiSaveSimTTLFile.Size = new System.Drawing.Size(186, 22);
            this.tsmiSaveSimTTLFile.Text = "Save SimTTLFile";
            this.tsmiSaveSimTTLFile.Click += new System.EventHandler(this.tsmiSaveSimTTLFile_Click);
            // 
            // toolStripSeparator1
            // 
            this.toolStripSeparator1.Name = "toolStripSeparator1";
            this.toolStripSeparator1.Size = new System.Drawing.Size(183, 6);
            // 
            // tsmiSaveCurrentSettings
            // 
            this.tsmiSaveCurrentSettings.Name = "tsmiSaveCurrentSettings";
            this.tsmiSaveCurrentSettings.Size = new System.Drawing.Size(186, 22);
            this.tsmiSaveCurrentSettings.Text = "Save Current Settings";
            this.tsmiSaveCurrentSettings.Click += new System.EventHandler(this.tsmiSaveCurrentSettings_Click);
            // 
            // toolStripMenuItem1
            // 
            this.toolStripMenuItem1.Name = "toolStripMenuItem1";
            this.toolStripMenuItem1.Size = new System.Drawing.Size(183, 6);
            // 
            // tsmiExportConnections
            // 
            this.tsmiExportConnections.Name = "tsmiExportConnections";
            this.tsmiExportConnections.Size = new System.Drawing.Size(186, 22);
            this.tsmiExportConnections.Text = "Export Connections";
            this.tsmiExportConnections.Click += new System.EventHandler(this.tsmiExportConnections_Click);
            // 
            // toolStripMenuItem2
            // 
            this.toolStripMenuItem2.Name = "toolStripMenuItem2";
            this.toolStripMenuItem2.Size = new System.Drawing.Size(183, 6);
            // 
            // tsmiPrintSetup
            // 
            this.tsmiPrintSetup.Name = "tsmiPrintSetup";
            this.tsmiPrintSetup.Size = new System.Drawing.Size(186, 22);
            this.tsmiPrintSetup.Text = "Print Setup";
            this.tsmiPrintSetup.Click += new System.EventHandler(this.tsmiPrintSetup_Click);
            // 
            // tsmiPrintView
            // 
            this.tsmiPrintView.Name = "tsmiPrintView";
            this.tsmiPrintView.Size = new System.Drawing.Size(186, 22);
            this.tsmiPrintView.Text = "Print View";
            this.tsmiPrintView.Click += new System.EventHandler(this.tsmiPrint_Click);
            // 
            // tsmiPrintAll
            // 
            this.tsmiPrintAll.Name = "tsmiPrintAll";
            this.tsmiPrintAll.Size = new System.Drawing.Size(186, 22);
            this.tsmiPrintAll.Text = "Print All";
            this.tsmiPrintAll.Click += new System.EventHandler(this.tsmiPrint_Click);
            // 
            // toolStripSeparator3
            // 
            this.toolStripSeparator3.Name = "toolStripSeparator3";
            this.toolStripSeparator3.Size = new System.Drawing.Size(183, 6);
            // 
            // tsmiExit
            // 
            this.tsmiExit.Name = "tsmiExit";
            this.tsmiExit.Size = new System.Drawing.Size(186, 22);
            this.tsmiExit.Text = "E&xit";
            this.tsmiExit.Click += new System.EventHandler(this.tsmiExit_Click);
            // 
            // tsmiEdit
            // 
            this.tsmiEdit.DropDownItems.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.tsmiExpandAll,
            this.tsmiShowPinNo,
            this.tsmiAutoCloseImportForm,
            this.toolStripMenuItem7,
            this.tsmiSearchSignal});
            this.tsmiEdit.Name = "tsmiEdit";
            this.tsmiEdit.Size = new System.Drawing.Size(39, 20);
            this.tsmiEdit.Text = "Edit";
            // 
            // tsmiExpandAll
            // 
            this.tsmiExpandAll.CheckOnClick = true;
            this.tsmiExpandAll.Name = "tsmiExpandAll";
            this.tsmiExpandAll.Size = new System.Drawing.Size(202, 22);
            this.tsmiExpandAll.Text = "Expand All";
            this.tsmiExpandAll.Click += new System.EventHandler(this.tsmiExpandAll_Click);
            // 
            // tsmiShowPinNo
            // 
            this.tsmiShowPinNo.CheckOnClick = true;
            this.tsmiShowPinNo.Name = "tsmiShowPinNo";
            this.tsmiShowPinNo.Size = new System.Drawing.Size(202, 22);
            this.tsmiShowPinNo.Text = "Show Pin Numbers";
            this.tsmiShowPinNo.Click += new System.EventHandler(this.tsmiShowPinNo_Click);
            // 
            // tsmiAutoCloseImportForm
            // 
            this.tsmiAutoCloseImportForm.CheckOnClick = true;
            this.tsmiAutoCloseImportForm.Name = "tsmiAutoCloseImportForm";
            this.tsmiAutoCloseImportForm.Size = new System.Drawing.Size(202, 22);
            this.tsmiAutoCloseImportForm.Text = "Auto Close Import Form";
            // 
            // toolStripMenuItem7
            // 
            this.toolStripMenuItem7.Name = "toolStripMenuItem7";
            this.toolStripMenuItem7.Size = new System.Drawing.Size(199, 6);
            // 
            // tsmiSearchSignal
            // 
            this.tsmiSearchSignal.Name = "tsmiSearchSignal";
            this.tsmiSearchSignal.Size = new System.Drawing.Size(202, 22);
            this.tsmiSearchSignal.Text = "Search Signal";
            this.tsmiSearchSignal.Click += new System.EventHandler(this.tsbSearch_Click);
            // 
            // tsmiSimulation
            // 
            this.tsmiSimulation.DropDownItems.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.tsmiSettings,
            this.tsmiSelectSignals,
            this.tsmiRestartSimulation,
            this.tsmiContinueSimulation});
            this.tsmiSimulation.Name = "tsmiSimulation";
            this.tsmiSimulation.Size = new System.Drawing.Size(76, 20);
            this.tsmiSimulation.Text = "Simulation";
            // 
            // tsmiSettings
            // 
            this.tsmiSettings.Name = "tsmiSettings";
            this.tsmiSettings.Size = new System.Drawing.Size(183, 22);
            this.tsmiSettings.Text = "Settings";
            this.tsmiSettings.Click += new System.EventHandler(this.tsmiSettings_Click);
            // 
            // tsmiSelectSignals
            // 
            this.tsmiSelectSignals.Name = "tsmiSelectSignals";
            this.tsmiSelectSignals.Size = new System.Drawing.Size(183, 22);
            this.tsmiSelectSignals.Text = "Select Signals";
            this.tsmiSelectSignals.Click += new System.EventHandler(this.tsmiSelectSignals_Click);
            // 
            // tsmiRestartSimulation
            // 
            this.tsmiRestartSimulation.Name = "tsmiRestartSimulation";
            this.tsmiRestartSimulation.Size = new System.Drawing.Size(183, 22);
            this.tsmiRestartSimulation.Text = "Restart Simulation";
            this.tsmiRestartSimulation.Click += new System.EventHandler(this.tsmiRestartSimulation_Click);
            // 
            // tsmiContinueSimulation
            // 
            this.tsmiContinueSimulation.Name = "tsmiContinueSimulation";
            this.tsmiContinueSimulation.Size = new System.Drawing.Size(183, 22);
            this.tsmiContinueSimulation.Text = "Continue Simulation";
            this.tsmiContinueSimulation.Click += new System.EventHandler(this.tsmiContinueSimulation_Click);
            // 
            // ssStatus
            // 
            this.ssStatus.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.tsslSchematicsName,
            this.tsslSpace,
            this.tsslActivity,
            this.tspbProgress,
            this.tsslTime});
            this.ssStatus.Location = new System.Drawing.Point(0, 959);
            this.ssStatus.Name = "ssStatus";
            this.ssStatus.Size = new System.Drawing.Size(1904, 22);
            this.ssStatus.TabIndex = 1;
            this.ssStatus.Text = "statusStrip1";
            // 
            // tsslSchematicsName
            // 
            this.tsslSchematicsName.Name = "tsslSchematicsName";
            this.tsslSchematicsName.Size = new System.Drawing.Size(12, 17);
            this.tsslSchematicsName.Text = "-";
            // 
            // tsslSpace
            // 
            this.tsslSpace.AutoSize = false;
            this.tsslSpace.Name = "tsslSpace";
            this.tsslSpace.Size = new System.Drawing.Size(100, 17);
            // 
            // tsslActivity
            // 
            this.tsslActivity.Name = "tsslActivity";
            this.tsslActivity.Size = new System.Drawing.Size(12, 17);
            this.tsslActivity.Text = "-";
            this.tsslActivity.Visible = false;
            // 
            // tspbProgress
            // 
            this.tspbProgress.Name = "tspbProgress";
            this.tspbProgress.Size = new System.Drawing.Size(500, 16);
            this.tspbProgress.Visible = false;
            // 
            // tsslTime
            // 
            this.tsslTime.Name = "tsslTime";
            this.tsslTime.Size = new System.Drawing.Size(12, 17);
            this.tsslTime.Text = "-";
            // 
            // pnControl
            // 
            this.pnControl.Controls.Add(this.label4);
            this.pnControl.Controls.Add(this.label3);
            this.pnControl.Controls.Add(this.label2);
            this.pnControl.Controls.Add(this.label1);
            this.pnControl.Controls.Add(this.lbMouseCoord);
            this.pnControl.Dock = System.Windows.Forms.DockStyle.Bottom;
            this.pnControl.Location = new System.Drawing.Point(0, 927);
            this.pnControl.Name = "pnControl";
            this.pnControl.Size = new System.Drawing.Size(1904, 32);
            this.pnControl.TabIndex = 2;
            this.pnControl.Visible = false;
            // 
            // label4
            // 
            this.label4.AutoSize = true;
            this.label4.Location = new System.Drawing.Point(429, 11);
            this.label4.Name = "label4";
            this.label4.Size = new System.Drawing.Size(35, 13);
            this.label4.TabIndex = 4;
            this.label4.Text = "label4";
            // 
            // label3
            // 
            this.label3.AutoSize = true;
            this.label3.Location = new System.Drawing.Point(1795, 11);
            this.label3.Name = "label3";
            this.label3.Size = new System.Drawing.Size(35, 13);
            this.label3.TabIndex = 3;
            this.label3.Text = "label3";
            // 
            // label2
            // 
            this.label2.AutoSize = true;
            this.label2.Location = new System.Drawing.Point(249, 11);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(35, 13);
            this.label2.TabIndex = 2;
            this.label2.Text = "label2";
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(67, 11);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(35, 13);
            this.label1.TabIndex = 1;
            this.label1.Text = "label1";
            // 
            // lbMouseCoord
            // 
            this.lbMouseCoord.AutoSize = true;
            this.lbMouseCoord.Location = new System.Drawing.Point(972, 11);
            this.lbMouseCoord.Name = "lbMouseCoord";
            this.lbMouseCoord.Size = new System.Drawing.Size(35, 13);
            this.lbMouseCoord.TabIndex = 0;
            this.lbMouseCoord.Text = "label1";
            // 
            // pnSignalNamesBack
            // 
            this.pnSignalNamesBack.Controls.Add(this.pnSignalNames);
            this.pnSignalNamesBack.Controls.Add(this.pnNameHeader);
            this.pnSignalNamesBack.Dock = System.Windows.Forms.DockStyle.Left;
            this.pnSignalNamesBack.Location = new System.Drawing.Point(0, 25);
            this.pnSignalNamesBack.Name = "pnSignalNamesBack";
            this.pnSignalNamesBack.Size = new System.Drawing.Size(200, 839);
            this.pnSignalNamesBack.TabIndex = 3;
            // 
            // pnSignalNames
            // 
            this.pnSignalNames.BackColor = System.Drawing.Color.Black;
            this.pnSignalNames.Controls.Add(this.pbSignalNames);
            this.pnSignalNames.Dock = System.Windows.Forms.DockStyle.Fill;
            this.pnSignalNames.Location = new System.Drawing.Point(0, 25);
            this.pnSignalNames.Name = "pnSignalNames";
            this.pnSignalNames.Size = new System.Drawing.Size(200, 814);
            this.pnSignalNames.TabIndex = 2;
            // 
            // pbSignalNames
            // 
            this.pbSignalNames.Location = new System.Drawing.Point(0, 0);
            this.pbSignalNames.Name = "pbSignalNames";
            this.pbSignalNames.Size = new System.Drawing.Size(400, 50);
            this.pbSignalNames.SizeMode = System.Windows.Forms.PictureBoxSizeMode.AutoSize;
            this.pbSignalNames.TabIndex = 0;
            this.pbSignalNames.TabStop = false;
            this.pbSignalNames.Paint += new System.Windows.Forms.PaintEventHandler(this.pbSignalNames_Paint);
            this.pbSignalNames.MouseDown += new System.Windows.Forms.MouseEventHandler(this.pbSignalNames_MouseDown);
            this.pbSignalNames.MouseLeave += new System.EventHandler(this.pbSignalNames_MouseLeave);
            this.pbSignalNames.MouseMove += new System.Windows.Forms.MouseEventHandler(this.pbSignalNames_MouseMove);
            this.pbSignalNames.MouseUp += new System.Windows.Forms.MouseEventHandler(this.pbSignalNames_MouseUp);
            // 
            // pnNameHeader
            // 
            this.pnNameHeader.BackColor = System.Drawing.SystemColors.Control;
            this.pnNameHeader.Controls.Add(this.lbName);
            this.pnNameHeader.Dock = System.Windows.Forms.DockStyle.Top;
            this.pnNameHeader.ForeColor = System.Drawing.Color.Black;
            this.pnNameHeader.Location = new System.Drawing.Point(0, 0);
            this.pnNameHeader.Name = "pnNameHeader";
            this.pnNameHeader.Size = new System.Drawing.Size(200, 25);
            this.pnNameHeader.TabIndex = 1;
            // 
            // lbName
            // 
            this.lbName.Dock = System.Windows.Forms.DockStyle.Fill;
            this.lbName.Font = new System.Drawing.Font("Microsoft Sans Serif", 9.75F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.lbName.Location = new System.Drawing.Point(0, 0);
            this.lbName.Name = "lbName";
            this.lbName.Size = new System.Drawing.Size(200, 25);
            this.lbName.TabIndex = 0;
            this.lbName.Text = "Name";
            this.lbName.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // splitter1
            // 
            this.splitter1.Location = new System.Drawing.Point(200, 25);
            this.splitter1.Name = "splitter1";
            this.splitter1.Size = new System.Drawing.Size(3, 839);
            this.splitter1.TabIndex = 4;
            this.splitter1.TabStop = false;
            // 
            // pnSignalValuesBack
            // 
            this.pnSignalValuesBack.Controls.Add(this.pnSignalValues);
            this.pnSignalValuesBack.Controls.Add(this.pnValuesHeader);
            this.pnSignalValuesBack.Dock = System.Windows.Forms.DockStyle.Fill;
            this.pnSignalValuesBack.Location = new System.Drawing.Point(203, 25);
            this.pnSignalValuesBack.Name = "pnSignalValuesBack";
            this.pnSignalValuesBack.Size = new System.Drawing.Size(97, 839);
            this.pnSignalValuesBack.TabIndex = 5;
            // 
            // pnSignalValues
            // 
            this.pnSignalValues.BackColor = System.Drawing.Color.Black;
            this.pnSignalValues.Controls.Add(this.pbSignalValues);
            this.pnSignalValues.Dock = System.Windows.Forms.DockStyle.Fill;
            this.pnSignalValues.Location = new System.Drawing.Point(0, 25);
            this.pnSignalValues.Name = "pnSignalValues";
            this.pnSignalValues.Size = new System.Drawing.Size(97, 814);
            this.pnSignalValues.TabIndex = 2;
            // 
            // pbSignalValues
            // 
            this.pbSignalValues.Location = new System.Drawing.Point(0, 0);
            this.pbSignalValues.Name = "pbSignalValues";
            this.pbSignalValues.Size = new System.Drawing.Size(250, 50);
            this.pbSignalValues.SizeMode = System.Windows.Forms.PictureBoxSizeMode.AutoSize;
            this.pbSignalValues.TabIndex = 0;
            this.pbSignalValues.TabStop = false;
            this.pbSignalValues.Paint += new System.Windows.Forms.PaintEventHandler(this.pbSignalValues_Paint);
            this.pbSignalValues.MouseDown += new System.Windows.Forms.MouseEventHandler(this.pbSignalValues_MouseDown);
            // 
            // pnValuesHeader
            // 
            this.pnValuesHeader.BackColor = System.Drawing.SystemColors.Control;
            this.pnValuesHeader.Controls.Add(this.lbValue);
            this.pnValuesHeader.Dock = System.Windows.Forms.DockStyle.Top;
            this.pnValuesHeader.ForeColor = System.Drawing.Color.Black;
            this.pnValuesHeader.Location = new System.Drawing.Point(0, 0);
            this.pnValuesHeader.Name = "pnValuesHeader";
            this.pnValuesHeader.Size = new System.Drawing.Size(97, 25);
            this.pnValuesHeader.TabIndex = 1;
            // 
            // lbValue
            // 
            this.lbValue.Dock = System.Windows.Forms.DockStyle.Fill;
            this.lbValue.Font = new System.Drawing.Font("Microsoft Sans Serif", 9.75F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.lbValue.Location = new System.Drawing.Point(0, 0);
            this.lbValue.Name = "lbValue";
            this.lbValue.Size = new System.Drawing.Size(97, 25);
            this.lbValue.TabIndex = 1;
            this.lbValue.Text = "Value";
            this.lbValue.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // splitter2
            // 
            this.splitter2.Location = new System.Drawing.Point(300, 63);
            this.splitter2.Name = "splitter2";
            this.splitter2.Size = new System.Drawing.Size(3, 864);
            this.splitter2.TabIndex = 6;
            this.splitter2.TabStop = false;
            // 
            // pnSignalGraphs
            // 
            this.pnSignalGraphs.AutoScroll = true;
            this.pnSignalGraphs.BackColor = System.Drawing.Color.Black;
            this.pnSignalGraphs.Controls.Add(this.pbSignalGraphs);
            this.pnSignalGraphs.Dock = System.Windows.Forms.DockStyle.Fill;
            this.pnSignalGraphs.Location = new System.Drawing.Point(303, 113);
            this.pnSignalGraphs.Margin = new System.Windows.Forms.Padding(3, 0, 3, 3);
            this.pnSignalGraphs.Name = "pnSignalGraphs";
            this.pnSignalGraphs.Size = new System.Drawing.Size(1601, 814);
            this.pnSignalGraphs.TabIndex = 7;
            // 
            // pbSignalGraphs
            // 
            this.pbSignalGraphs.Location = new System.Drawing.Point(0, 0);
            this.pbSignalGraphs.Margin = new System.Windows.Forms.Padding(3, 0, 3, 3);
            this.pbSignalGraphs.Name = "pbSignalGraphs";
            this.pbSignalGraphs.Size = new System.Drawing.Size(1580, 50);
            this.pbSignalGraphs.SizeMode = System.Windows.Forms.PictureBoxSizeMode.AutoSize;
            this.pbSignalGraphs.TabIndex = 0;
            this.pbSignalGraphs.TabStop = false;
            this.pbSignalGraphs.LocationChanged += new System.EventHandler(this.pbSignalGraphs_LocationChanged);
            this.pbSignalGraphs.Paint += new System.Windows.Forms.PaintEventHandler(this.pbSignalGraphs_Paint);
            this.pbSignalGraphs.MouseDown += new System.Windows.Forms.MouseEventHandler(this.pbSignalGraphs_MouseDown);
            this.pbSignalGraphs.MouseLeave += new System.EventHandler(this.pbSignalGraphs_MouseLeave);
            this.pbSignalGraphs.MouseMove += new System.Windows.Forms.MouseEventHandler(this.pbSignalGraphs_MouseMove);
            this.pbSignalGraphs.MouseUp += new System.Windows.Forms.MouseEventHandler(this.pbSignalGraphs_MouseUp);
            // 
            // cmsFormat
            // 
            this.cmsFormat.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.tsmiBinary,
            this.tsmiDecimal,
            this.tsmiSignedDec,
            this.tsmiHexadecimal,
            this.toolStripMenuItem4,
            this.tsmiInvert,
            this.tsmiReverse,
            this.toolStripMenuItem3,
            this.tsmiHighlight});
            this.cmsFormat.Name = "contextMenuStrip1";
            this.cmsFormat.Size = new System.Drawing.Size(143, 170);
            // 
            // tsmiBinary
            // 
            this.tsmiBinary.Name = "tsmiBinary";
            this.tsmiBinary.Size = new System.Drawing.Size(142, 22);
            this.tsmiBinary.Text = "Binary";
            this.tsmiBinary.Click += new System.EventHandler(this.tsmiBinary_Click);
            // 
            // tsmiDecimal
            // 
            this.tsmiDecimal.Name = "tsmiDecimal";
            this.tsmiDecimal.Size = new System.Drawing.Size(142, 22);
            this.tsmiDecimal.Text = "Decimal";
            this.tsmiDecimal.Click += new System.EventHandler(this.tsmiDecimal_Click);
            // 
            // tsmiSignedDec
            // 
            this.tsmiSignedDec.Name = "tsmiSignedDec";
            this.tsmiSignedDec.Size = new System.Drawing.Size(142, 22);
            this.tsmiSignedDec.Text = "Signed Dec.";
            this.tsmiSignedDec.Click += new System.EventHandler(this.tsmiSignedDec_Click);
            // 
            // tsmiHexadecimal
            // 
            this.tsmiHexadecimal.Name = "tsmiHexadecimal";
            this.tsmiHexadecimal.Size = new System.Drawing.Size(142, 22);
            this.tsmiHexadecimal.Text = "Hexadecimal";
            this.tsmiHexadecimal.Click += new System.EventHandler(this.tsmiHexadecimal_Click);
            // 
            // toolStripMenuItem4
            // 
            this.toolStripMenuItem4.Name = "toolStripMenuItem4";
            this.toolStripMenuItem4.Size = new System.Drawing.Size(139, 6);
            // 
            // tsmiInvert
            // 
            this.tsmiInvert.CheckOnClick = true;
            this.tsmiInvert.Name = "tsmiInvert";
            this.tsmiInvert.Size = new System.Drawing.Size(142, 22);
            this.tsmiInvert.Text = "Invert";
            this.tsmiInvert.Click += new System.EventHandler(this.tsmiInvert_Click);
            // 
            // tsmiReverse
            // 
            this.tsmiReverse.CheckOnClick = true;
            this.tsmiReverse.Name = "tsmiReverse";
            this.tsmiReverse.Size = new System.Drawing.Size(142, 22);
            this.tsmiReverse.Text = "Reverse";
            this.tsmiReverse.Click += new System.EventHandler(this.tsmiReverse_Click);
            // 
            // toolStripMenuItem3
            // 
            this.toolStripMenuItem3.Name = "toolStripMenuItem3";
            this.toolStripMenuItem3.Size = new System.Drawing.Size(139, 6);
            // 
            // tsmiHighlight
            // 
            this.tsmiHighlight.CheckOnClick = true;
            this.tsmiHighlight.Name = "tsmiHighlight";
            this.tsmiHighlight.Size = new System.Drawing.Size(142, 22);
            this.tsmiHighlight.Text = "Highlight";
            this.tsmiHighlight.Click += new System.EventHandler(this.tsmiHighlight_Click);
            // 
            // toolStrip1
            // 
            this.toolStrip1.ImageScalingSize = new System.Drawing.Size(32, 32);
            this.toolStrip1.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.tsbSettings,
            this.tsbExpandAll,
            this.tsbCollapseAll,
            this.tsbSearch,
            this.tsbSaveSimTTLFile,
            this.tsbZoomIn,
            this.tsbZoomOut,
            this.tsbZoomFit,
            this.tsbUnselectAll,
            this.tsbGotoCursor,
            this.tsbGotoZero,
            this.tsbGotoLast,
            this.tsbPrevTransistion,
            this.tsbNextTransition,
            this.tsbAddMarker,
            this.tsbPrevMarker,
            this.tsbNextMarker,
            this.tsbDeleteAllMarkers,
            this.tsbDeleteSelected});
            this.toolStrip1.Location = new System.Drawing.Point(0, 24);
            this.toolStrip1.Name = "toolStrip1";
            this.toolStrip1.Size = new System.Drawing.Size(1904, 39);
            this.toolStrip1.TabIndex = 1;
            this.toolStrip1.Text = "toolStrip1";
            // 
            // tsbSettings
            // 
            this.tsbSettings.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbSettings.Image = ((System.Drawing.Image)(resources.GetObject("tsbSettings.Image")));
            this.tsbSettings.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbSettings.Name = "tsbSettings";
            this.tsbSettings.Size = new System.Drawing.Size(36, 36);
            this.tsbSettings.Text = "Settings";
            this.tsbSettings.Click += new System.EventHandler(this.tsmiSettings_Click);
            // 
            // tsbExpandAll
            // 
            this.tsbExpandAll.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbExpandAll.Image = ((System.Drawing.Image)(resources.GetObject("tsbExpandAll.Image")));
            this.tsbExpandAll.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbExpandAll.Name = "tsbExpandAll";
            this.tsbExpandAll.Size = new System.Drawing.Size(36, 36);
            this.tsbExpandAll.Text = "Expand All";
            this.tsbExpandAll.Click += new System.EventHandler(this.tsbExpandAll_Click);
            // 
            // tsbCollapseAll
            // 
            this.tsbCollapseAll.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbCollapseAll.Image = ((System.Drawing.Image)(resources.GetObject("tsbCollapseAll.Image")));
            this.tsbCollapseAll.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbCollapseAll.Name = "tsbCollapseAll";
            this.tsbCollapseAll.Size = new System.Drawing.Size(36, 36);
            this.tsbCollapseAll.Text = "Collapse All";
            this.tsbCollapseAll.Click += new System.EventHandler(this.tsbCollapseAll_Click);
            // 
            // tsbSearch
            // 
            this.tsbSearch.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbSearch.Image = ((System.Drawing.Image)(resources.GetObject("tsbSearch.Image")));
            this.tsbSearch.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbSearch.Name = "tsbSearch";
            this.tsbSearch.Size = new System.Drawing.Size(36, 36);
            this.tsbSearch.Text = "Search Signal";
            this.tsbSearch.Click += new System.EventHandler(this.tsbSearch_Click);
            // 
            // tsbSaveSimTTLFile
            // 
            this.tsbSaveSimTTLFile.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbSaveSimTTLFile.Image = ((System.Drawing.Image)(resources.GetObject("tsbSaveSimTTLFile.Image")));
            this.tsbSaveSimTTLFile.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbSaveSimTTLFile.Name = "tsbSaveSimTTLFile";
            this.tsbSaveSimTTLFile.Size = new System.Drawing.Size(36, 36);
            this.tsbSaveSimTTLFile.Text = "Save SimTTLFile";
            this.tsbSaveSimTTLFile.Click += new System.EventHandler(this.tsmiSaveSimTTLFile_Click);
            // 
            // tsbZoomIn
            // 
            this.tsbZoomIn.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbZoomIn.Image = ((System.Drawing.Image)(resources.GetObject("tsbZoomIn.Image")));
            this.tsbZoomIn.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbZoomIn.Name = "tsbZoomIn";
            this.tsbZoomIn.Size = new System.Drawing.Size(36, 36);
            this.tsbZoomIn.Text = "Zoom In";
            this.tsbZoomIn.Click += new System.EventHandler(this.tsbZoomIn_Click);
            // 
            // tsbZoomOut
            // 
            this.tsbZoomOut.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbZoomOut.Image = ((System.Drawing.Image)(resources.GetObject("tsbZoomOut.Image")));
            this.tsbZoomOut.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbZoomOut.Name = "tsbZoomOut";
            this.tsbZoomOut.Size = new System.Drawing.Size(36, 36);
            this.tsbZoomOut.Text = "Zoom Out";
            this.tsbZoomOut.Click += new System.EventHandler(this.tsbZoomOut_Click);
            // 
            // tsbZoomFit
            // 
            this.tsbZoomFit.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbZoomFit.Image = ((System.Drawing.Image)(resources.GetObject("tsbZoomFit.Image")));
            this.tsbZoomFit.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbZoomFit.Name = "tsbZoomFit";
            this.tsbZoomFit.Size = new System.Drawing.Size(36, 36);
            this.tsbZoomFit.Text = "Zoom Fit";
            this.tsbZoomFit.Click += new System.EventHandler(this.tsbZoomFit_Click);
            // 
            // tsbUnselectAll
            // 
            this.tsbUnselectAll.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbUnselectAll.Image = ((System.Drawing.Image)(resources.GetObject("tsbUnselectAll.Image")));
            this.tsbUnselectAll.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbUnselectAll.Name = "tsbUnselectAll";
            this.tsbUnselectAll.Size = new System.Drawing.Size(36, 36);
            this.tsbUnselectAll.Text = "Unselect All";
            this.tsbUnselectAll.Click += new System.EventHandler(this.tsbUnselectAll_Click);
            // 
            // tsbGotoCursor
            // 
            this.tsbGotoCursor.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbGotoCursor.Image = ((System.Drawing.Image)(resources.GetObject("tsbGotoCursor.Image")));
            this.tsbGotoCursor.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbGotoCursor.Name = "tsbGotoCursor";
            this.tsbGotoCursor.Size = new System.Drawing.Size(36, 36);
            this.tsbGotoCursor.Text = "Goto Cursor Marker";
            this.tsbGotoCursor.Click += new System.EventHandler(this.tsbGotoCursor_Click);
            // 
            // tsbGotoZero
            // 
            this.tsbGotoZero.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbGotoZero.Image = ((System.Drawing.Image)(resources.GetObject("tsbGotoZero.Image")));
            this.tsbGotoZero.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbGotoZero.Name = "tsbGotoZero";
            this.tsbGotoZero.Size = new System.Drawing.Size(36, 36);
            this.tsbGotoZero.Text = "Goto Zero";
            this.tsbGotoZero.Click += new System.EventHandler(this.tsbGotoZero_Click);
            // 
            // tsbGotoLast
            // 
            this.tsbGotoLast.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbGotoLast.Image = ((System.Drawing.Image)(resources.GetObject("tsbGotoLast.Image")));
            this.tsbGotoLast.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbGotoLast.Name = "tsbGotoLast";
            this.tsbGotoLast.Size = new System.Drawing.Size(36, 36);
            this.tsbGotoLast.Text = "Goto Last";
            this.tsbGotoLast.Click += new System.EventHandler(this.tsbGotoLast_Click);
            // 
            // tsbPrevTransistion
            // 
            this.tsbPrevTransistion.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbPrevTransistion.Image = ((System.Drawing.Image)(resources.GetObject("tsbPrevTransistion.Image")));
            this.tsbPrevTransistion.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbPrevTransistion.Name = "tsbPrevTransistion";
            this.tsbPrevTransistion.Size = new System.Drawing.Size(36, 36);
            this.tsbPrevTransistion.Text = "Previous Transition";
            this.tsbPrevTransistion.Click += new System.EventHandler(this.tsbPrevTransistion_Click);
            // 
            // tsbNextTransition
            // 
            this.tsbNextTransition.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbNextTransition.Image = ((System.Drawing.Image)(resources.GetObject("tsbNextTransition.Image")));
            this.tsbNextTransition.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbNextTransition.Name = "tsbNextTransition";
            this.tsbNextTransition.Size = new System.Drawing.Size(36, 36);
            this.tsbNextTransition.Text = "Next Transition";
            this.tsbNextTransition.Click += new System.EventHandler(this.tsbNextTransition_Click);
            // 
            // tsbAddMarker
            // 
            this.tsbAddMarker.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbAddMarker.Image = ((System.Drawing.Image)(resources.GetObject("tsbAddMarker.Image")));
            this.tsbAddMarker.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbAddMarker.Name = "tsbAddMarker";
            this.tsbAddMarker.Size = new System.Drawing.Size(36, 36);
            this.tsbAddMarker.Text = "Add Marker";
            this.tsbAddMarker.Click += new System.EventHandler(this.tsbAddMarker_Click);
            // 
            // tsbPrevMarker
            // 
            this.tsbPrevMarker.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbPrevMarker.Image = ((System.Drawing.Image)(resources.GetObject("tsbPrevMarker.Image")));
            this.tsbPrevMarker.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbPrevMarker.Name = "tsbPrevMarker";
            this.tsbPrevMarker.Size = new System.Drawing.Size(36, 36);
            this.tsbPrevMarker.Text = "Previous Marker";
            this.tsbPrevMarker.Click += new System.EventHandler(this.tsbPrevMarker_Click);
            // 
            // tsbNextMarker
            // 
            this.tsbNextMarker.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbNextMarker.Image = ((System.Drawing.Image)(resources.GetObject("tsbNextMarker.Image")));
            this.tsbNextMarker.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbNextMarker.Name = "tsbNextMarker";
            this.tsbNextMarker.Size = new System.Drawing.Size(36, 36);
            this.tsbNextMarker.Text = "Next Marker";
            this.tsbNextMarker.Click += new System.EventHandler(this.tsbNextMarker_Click);
            // 
            // tsbDeleteAllMarkers
            // 
            this.tsbDeleteAllMarkers.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbDeleteAllMarkers.Image = ((System.Drawing.Image)(resources.GetObject("tsbDeleteAllMarkers.Image")));
            this.tsbDeleteAllMarkers.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbDeleteAllMarkers.Name = "tsbDeleteAllMarkers";
            this.tsbDeleteAllMarkers.Size = new System.Drawing.Size(36, 36);
            this.tsbDeleteAllMarkers.Text = "Delete All Markers";
            this.tsbDeleteAllMarkers.Click += new System.EventHandler(this.tsbDeleteAllMarkers_Click);
            // 
            // tsbDeleteSelected
            // 
            this.tsbDeleteSelected.DisplayStyle = System.Windows.Forms.ToolStripItemDisplayStyle.Image;
            this.tsbDeleteSelected.Image = ((System.Drawing.Image)(resources.GetObject("tsbDeleteSelected.Image")));
            this.tsbDeleteSelected.ImageTransparentColor = System.Drawing.Color.Magenta;
            this.tsbDeleteSelected.Name = "tsbDeleteSelected";
            this.tsbDeleteSelected.Size = new System.Drawing.Size(36, 36);
            this.tsbDeleteSelected.Text = "Delete Selected";
            this.tsbDeleteSelected.Click += new System.EventHandler(this.tsbDeleteSelected_Click);
            // 
            // pnSignalGraphRuler
            // 
            this.pnSignalGraphRuler.BackColor = System.Drawing.Color.Black;
            this.pnSignalGraphRuler.Controls.Add(this.pbSignalGraphRuler);
            this.pnSignalGraphRuler.Dock = System.Windows.Forms.DockStyle.Top;
            this.pnSignalGraphRuler.ForeColor = System.Drawing.Color.Black;
            this.pnSignalGraphRuler.Location = new System.Drawing.Point(303, 63);
            this.pnSignalGraphRuler.Margin = new System.Windows.Forms.Padding(3, 3, 3, 0);
            this.pnSignalGraphRuler.Name = "pnSignalGraphRuler";
            this.pnSignalGraphRuler.Size = new System.Drawing.Size(1601, 50);
            this.pnSignalGraphRuler.TabIndex = 8;
            // 
            // pbSignalGraphRuler
            // 
            this.pbSignalGraphRuler.Location = new System.Drawing.Point(0, 0);
            this.pbSignalGraphRuler.Margin = new System.Windows.Forms.Padding(3, 3, 3, 0);
            this.pbSignalGraphRuler.Name = "pbSignalGraphRuler";
            this.pbSignalGraphRuler.Size = new System.Drawing.Size(1600, 50);
            this.pbSignalGraphRuler.SizeMode = System.Windows.Forms.PictureBoxSizeMode.AutoSize;
            this.pbSignalGraphRuler.TabIndex = 0;
            this.pbSignalGraphRuler.TabStop = false;
            this.pbSignalGraphRuler.Paint += new System.Windows.Forms.PaintEventHandler(this.pbSignalGraphRuler_Paint);
            this.pbSignalGraphRuler.MouseDown += new System.Windows.Forms.MouseEventHandler(this.pbSignalGraphs_MouseDown);
            this.pbSignalGraphRuler.MouseLeave += new System.EventHandler(this.pbSignalGraphs_MouseLeave);
            this.pbSignalGraphRuler.MouseMove += new System.Windows.Forms.MouseEventHandler(this.pbSignalGraphs_MouseMove);
            this.pbSignalGraphRuler.MouseUp += new System.Windows.Forms.MouseEventHandler(this.pbSignalGraphs_MouseUp);
            // 
            // pnLeftHeader
            // 
            this.pnLeftHeader.BackColor = System.Drawing.Color.Black;
            this.pnLeftHeader.Dock = System.Windows.Forms.DockStyle.Top;
            this.pnLeftHeader.ForeColor = System.Drawing.Color.White;
            this.pnLeftHeader.Location = new System.Drawing.Point(0, 0);
            this.pnLeftHeader.Name = "pnLeftHeader";
            this.pnLeftHeader.Size = new System.Drawing.Size(300, 25);
            this.pnLeftHeader.TabIndex = 9;
            // 
            // pnLeft
            // 
            this.pnLeft.Controls.Add(this.pnSignalValuesBack);
            this.pnLeft.Controls.Add(this.splitter1);
            this.pnLeft.Controls.Add(this.pnSignalNamesBack);
            this.pnLeft.Controls.Add(this.pnLeftHeader);
            this.pnLeft.Dock = System.Windows.Forms.DockStyle.Left;
            this.pnLeft.Location = new System.Drawing.Point(0, 63);
            this.pnLeft.Name = "pnLeft";
            this.pnLeft.Size = new System.Drawing.Size(300, 864);
            this.pnLeft.TabIndex = 10;
            // 
            // ofdKiCadNetlist
            // 
            this.ofdKiCadNetlist.DefaultExt = "net";
            this.ofdKiCadNetlist.Filter = "\"KiCad Netlist|*.net";
            this.ofdKiCadNetlist.Title = "KiCad Netlist Import";
            // 
            // ofdSimTTLFile
            // 
            this.ofdSimTTLFile.DefaultExt = "sttlf";
            this.ofdSimTTLFile.Filter = "SimTTL Files|*.sttlf";
            this.ofdSimTTLFile.Title = "Load from SimTTLFile";
            // 
            // sfdSimTTLFile
            // 
            this.sfdSimTTLFile.DefaultExt = "sttlf";
            this.sfdSimTTLFile.Filter = "SimTTL Files|*.sttlf";
            this.sfdSimTTLFile.Title = "Save to SimTTLFile";
            // 
            // pdPrintContents
            // 
            this.pdPrintContents.UseEXDialog = true;
            // 
            // frmMain
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(1904, 981);
            this.Controls.Add(this.pnSignalGraphs);
            this.Controls.Add(this.pnSignalGraphRuler);
            this.Controls.Add(this.splitter2);
            this.Controls.Add(this.pnLeft);
            this.Controls.Add(this.toolStrip1);
            this.Controls.Add(this.pnControl);
            this.Controls.Add(this.ssStatus);
            this.Controls.Add(this.msMainMenu);
            this.Icon = ((System.Drawing.Icon)(resources.GetObject("$this.Icon")));
            this.MainMenuStrip = this.msMainMenu;
            this.Name = "frmMain";
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen;
            this.Text = "SimTTL";
            this.FormClosing += new System.Windows.Forms.FormClosingEventHandler(this.frmMain_FormClosing);
            this.Shown += new System.EventHandler(this.frmMain_Shown);
            this.KeyDown += new System.Windows.Forms.KeyEventHandler(this.frmMain_KeyDown);
            this.KeyUp += new System.Windows.Forms.KeyEventHandler(this.frmMain_KeyUp);
            this.msMainMenu.ResumeLayout(false);
            this.msMainMenu.PerformLayout();
            this.ssStatus.ResumeLayout(false);
            this.ssStatus.PerformLayout();
            this.pnControl.ResumeLayout(false);
            this.pnControl.PerformLayout();
            this.pnSignalNamesBack.ResumeLayout(false);
            this.pnSignalNames.ResumeLayout(false);
            this.pnSignalNames.PerformLayout();
            ((System.ComponentModel.ISupportInitialize)(this.pbSignalNames)).EndInit();
            this.pnNameHeader.ResumeLayout(false);
            this.pnSignalValuesBack.ResumeLayout(false);
            this.pnSignalValues.ResumeLayout(false);
            this.pnSignalValues.PerformLayout();
            ((System.ComponentModel.ISupportInitialize)(this.pbSignalValues)).EndInit();
            this.pnValuesHeader.ResumeLayout(false);
            this.pnSignalGraphs.ResumeLayout(false);
            this.pnSignalGraphs.PerformLayout();
            ((System.ComponentModel.ISupportInitialize)(this.pbSignalGraphs)).EndInit();
            this.cmsFormat.ResumeLayout(false);
            this.toolStrip1.ResumeLayout(false);
            this.toolStrip1.PerformLayout();
            this.pnSignalGraphRuler.ResumeLayout(false);
            this.pnSignalGraphRuler.PerformLayout();
            ((System.ComponentModel.ISupportInitialize)(this.pbSignalGraphRuler)).EndInit();
            this.pnLeft.ResumeLayout(false);
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.MenuStrip msMainMenu;
        private System.Windows.Forms.ToolStripMenuItem tsmiFile;
        private System.Windows.Forms.ToolStripMenuItem tsmiSaveCurrentSettings;
        private System.Windows.Forms.ToolStripSeparator toolStripMenuItem1;
        private System.Windows.Forms.ToolStripMenuItem tsmiExportConnections;
        private System.Windows.Forms.ToolStripSeparator toolStripMenuItem2;
        private System.Windows.Forms.ToolStripMenuItem tsmiExit;
        private System.Windows.Forms.ToolStripMenuItem tsmiEdit;
        private System.Windows.Forms.StatusStrip ssStatus;
        private System.Windows.Forms.Panel pnControl;
        private System.Windows.Forms.Panel pnSignalNamesBack;
        private System.Windows.Forms.Splitter splitter1;
        private System.Windows.Forms.Panel pnSignalValuesBack;
        private System.Windows.Forms.Splitter splitter2;
        private System.Windows.Forms.Panel pnSignalGraphs;
        private System.Windows.Forms.PictureBox pbSignalGraphs;
        private System.Windows.Forms.Label lbMouseCoord;
        private System.Windows.Forms.ContextMenuStrip cmsFormat;
        private System.Windows.Forms.ToolStripMenuItem tsmiBinary;
        private System.Windows.Forms.ToolStripMenuItem tsmiDecimal;
        private System.Windows.Forms.ToolStripMenuItem tsmiSignedDec;
        private System.Windows.Forms.ToolStripMenuItem tsmiHexadecimal;
        private System.Windows.Forms.ToolStrip toolStrip1;
        private System.Windows.Forms.ToolStripMenuItem tsmiSelectSignals;
        private System.Windows.Forms.ToolStripButton tsbSettings;
        private System.Windows.Forms.ToolStripMenuItem tsmiExpandAll;
        private System.Windows.Forms.ToolStripButton tsbExpandAll;
        private System.Windows.Forms.ToolStripButton tsbCollapseAll;
        private System.Windows.Forms.ToolStripButton tsbSearch;
        private System.Windows.Forms.ToolStripButton tsbSaveSimTTLFile;
        private System.Windows.Forms.ToolStripButton tsbZoomIn;
        private System.Windows.Forms.ToolStripButton tsbZoomOut;
        private System.Windows.Forms.ToolStripButton tsbZoomFit;
        private System.Windows.Forms.ToolStripButton tsbUnselectAll;
        private System.Windows.Forms.ToolStripButton tsbGotoCursor;
        private System.Windows.Forms.ToolStripButton tsbGotoZero;
        private System.Windows.Forms.ToolStripButton tsbGotoLast;
        private System.Windows.Forms.ToolStripButton tsbPrevTransistion;
        private System.Windows.Forms.ToolStripButton tsbNextTransition;
        private System.Windows.Forms.ToolStripButton tsbAddMarker;
        private System.Windows.Forms.ToolStripButton tsbPrevMarker;
        private System.Windows.Forms.ToolStripButton tsbNextMarker;
        private System.Windows.Forms.ToolStripButton tsbDeleteAllMarkers;
        private System.Windows.Forms.ToolStripButton tsbDeleteSelected;
        private System.Windows.Forms.Panel pnSignalGraphRuler;
        private System.Windows.Forms.Panel pnLeftHeader;
        private System.Windows.Forms.Panel pnLeft;
        private System.Windows.Forms.Panel pnNameHeader;
        private System.Windows.Forms.Panel pnValuesHeader;
        private System.Windows.Forms.PictureBox pbSignalNames;
        private System.Windows.Forms.PictureBox pbSignalValues;
        private System.Windows.Forms.Panel pnSignalNames;
        private System.Windows.Forms.Label lbName;
        private System.Windows.Forms.Panel pnSignalValues;
        private System.Windows.Forms.Label lbValue;
        private System.Windows.Forms.PictureBox pbSignalGraphRuler;
        private System.Windows.Forms.ToolStripStatusLabel tsslSchematicsName;
        private System.Windows.Forms.ToolStripProgressBar tspbProgress;
        private System.Windows.Forms.ToolStripStatusLabel tsslSpace;
        private System.Windows.Forms.ToolStripStatusLabel tsslActivity;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.Label label2;
        private System.Windows.Forms.Label label3;
        private System.Windows.Forms.ToolStripMenuItem tsmiLoadSchematics;
        private System.Windows.Forms.ToolStripSeparator toolStripSeparator1;
        private System.Windows.Forms.ToolStripMenuItem tsmiShowPinNo;
        private System.Windows.Forms.ToolStripMenuItem tsmiSimulation;
        private System.Windows.Forms.ToolStripMenuItem tsmiRestartSimulation;
        private System.Windows.Forms.ToolStripMenuItem tsmiSettings;
        private System.Windows.Forms.Label label4;
        private System.Windows.Forms.ToolStripSeparator toolStripMenuItem4;
        private System.Windows.Forms.ToolStripMenuItem tsmiInvert;
        private System.Windows.Forms.ToolStripMenuItem tsmiReverse;
        private System.Windows.Forms.ToolStripMenuItem tsmiAutoCloseImportForm;
        private System.Windows.Forms.ToolStripSeparator toolStripMenuItem3;
        private System.Windows.Forms.ToolStripMenuItem tsmiHighlight;
        private System.Windows.Forms.ToolStripMenuItem tsmiBuiltIn;
        private System.Windows.Forms.ToolStripMenuItem tsmiBenEater8BitComputer;
        private System.Windows.Forms.ToolStripMenuItem tsmiGigatronTTL;
        private System.Windows.Forms.ToolStripMenuItem tsmiTestSchematics;
        private System.Windows.Forms.ToolStripMenuItem tsmiKiCadNetlistImport;
        private System.Windows.Forms.ToolStripSeparator toolStripMenuItem5;
        private System.Windows.Forms.ToolStripSeparator toolStripSeparator2;
        private System.Windows.Forms.ToolStripSeparator toolStripMenuItem6;
        private System.Windows.Forms.ToolStripMenuItem tsmiLoadSimTTLFile;
        private System.Windows.Forms.ToolStripMenuItem tsmiSaveSimTTLFile;
        private System.Windows.Forms.OpenFileDialog ofdKiCadNetlist;
        private System.Windows.Forms.OpenFileDialog ofdSimTTLFile;
        private System.Windows.Forms.SaveFileDialog sfdSimTTLFile;
        private System.Windows.Forms.ToolStripMenuItem tsmiContinueSimulation;
        private System.Windows.Forms.ToolStripStatusLabel tsslTime;
        private System.Windows.Forms.ToolStripSeparator toolStripMenuItem7;
        private System.Windows.Forms.ToolStripMenuItem tsmiSearchSignal;
        private System.Windows.Forms.ToolStripMenuItem tsmiPrintAll;
        private System.Windows.Forms.ToolStripSeparator toolStripSeparator3;
        private System.Windows.Forms.ToolStripMenuItem tsmiPrintView;
        private System.Windows.Forms.ToolStripMenuItem tsmiPrintSetup;
        private System.Windows.Forms.PageSetupDialog psPrintSetup;
        private System.Windows.Forms.PrintDialog pdPrintContents;
    }
}

