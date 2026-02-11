// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

#define DEBUG_WRITE
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;

using SimBase;
using ChipLibrary;
using Schematics;
using System.Runtime.ConstrainedExecution;
using static System.Windows.Forms.VisualStyles.VisualStyleElement.TaskbarClock;
using System.Xml.Linq;
using System.Xml;
using System.Drawing.Text;
using System.Security;
using System.Drawing.Printing;
using System.Runtime.CompilerServices;

namespace SimTTL
{
    /// <summary>
    /// Main form of the SimTTL application containg the menu and the signal display area. All GUI event handler are placed here.
    /// </summary>
    public partial class frmMain : Form
    {
        #region Private Constants

        /// <summary>Margin from the top to the drawing area.</summary>
        private const int MARGIN_TOP = 0;
        /// <summary>Margin from the left to the drawing area.</summary>
        private const int MARGIN_LEFT = 10;
        /// <summary>Margin from the right to the drawing area.</summary>
        private const int MARGIN_RIGHT = 10;
        /// <summary>Margin from the bottom to the drawing area.</summary>
        private const int MARGIN_BOTTOM = 10;

        /// <summary>Vertical step between 2 signals.</summary>
        private const int VERTICAL_STEP = 23;
        /// <summary>Height of the signal from low to high level.</summary>
        private const int SIGNAL_HEIGHT = 15;

        /// <summary>Margin from the top to the signal name or value text.</summary>
        private const int TEXT_TOP = MARGIN_TOP + 8;
        /// <summary>Margin from the left to the signal name or value text.</summary>
        private const int TEXT_LEFT = MARGIN_LEFT + 10;
        /// <summary>Margin from the left to the indented signal name of expanded signals.</summary>
        private const int TEXT_INDENT_LEFT = TEXT_LEFT + 20;
        /// <summary>Margin from the left to the indented signal value of expanded signals.</summary>
        private const int VALUE_INDENT_LEFT = MARGIN_LEFT + 20;
        /// <summary>Font size of the signal names.</summary>
        private const float NAME_FONT_SIZE = 10f;
        /// <summary>Font size of the signal values.</summary>
        private const float VALUE_FONT_SIZE = 10f;
        /// <summary>Font size of the signal values inside of the signal graphs.</summary>
        private const float SIGNAL_FONT_SIZE = 8f;
        /// <summary>Width of the vertical scroll bar on the right side of the signal drawing area.</summary>
        private const int VSCROLL_BAR_WIDTH = 20;
        /// <summary>Mininmum x-coordinate delta to draw signal changes.</summary>
        private const int BUS_MIN_DX = 2;
        /// <summary>X Delta around a marker or cursor to grab the marker for moving.</summary>
        private const int MARKER_GRAB_RANGE = 3;
        #endregion Private Constants

        #region Bitmaps for drawing
        /// <summary>Drawing bitmap for the signal names on the left of the screen.</summary>
        private Bitmap bmSignalNames;
        /// <summary>Drawing bitmap for the cursor signal values right of the names.</summary>
        private Bitmap bmSignalValues;
        /// <summary>Drawing bitmap for the signal graphs, largest screen area between signal values and right border.</summary>
        private Bitmap bmSignalGraphs;
        /// <summary>Drawing bitmap for the ruler and marker values on top of the signal graph area.</summary>
        private Bitmap bmSignalGraphRuler;
        #endregion Bitmaps for drawing

        #region Simulation and Display
        /// <summary>Reference to the application settings instance to read and write XML files.</summary>
        internal AppSettings AppSettings;
        /// <summary>Reference to the schematics instance describing the components and connections.</summary>
        internal BaseSchematics Schematics;
        /// <summary>List of all currently displayed signals.</summary>
        internal List<DisplaySignal> CurrentSignals;
        /// <summary>List of all currently used stimulus objects.</summary>
        internal List<Stimulus> CurrentStimuli;
        /// <summary>List of all currently used trigger objects.</summary>
        internal List<Trigger> CurrentTriggers;

        /// <summary>The simulation time interval is the time step of the simulation.</summary>
        internal double SimulationTimeInterval;
        /// <summary>The simulation max time interval is the viewing time window of the signal graph area.</summary>
        internal double SimulationMaxTime;
        /// <summary>The time interval to add to the current max time for continuing the simulation.</summary>
        internal double SimulationContinueTime;
        /// <summary>This variable handles the current zoom factor. 1.0 means one SimulationTimeInterval step is displayed as a dx=1</summary>
        internal double SignalsZoomX;
        /// <summary>Signal graph minimum time on the left of the graph.</summary>
        internal double DisplayMinTime;
        /// <summary>Signal graph maximum time on the right of the graph.</summary>
        internal double DisplayMaxTime;
        #endregion Simulation and Display

        #region GUI variables
        /// <summary>Mouse x-coordinate in any of the areas.</summary>
        private int MouseX;
        /// <summary>Mouse y-coordinate in any of the areas.</summary>
        private int MouseY;
        /// <summary>Time of the simulation data calculated from y-coordinate.</summary>
        private double DataTime;
        /// <summary>DataTime value used in the previous step.</summary>
        private double LastDataTime;
        /// <summary>Reference to the signal object that had been previously selected.</summary>
        private DisplayElement LastSelectedSignal;
        /// <summary>Index of the signal object that had been previously selected.</summary>
        private int LastSelectedSignalIdx;
        /// <summary>Number of all currently selected signals.</summary>
        private int NoOfSelectedSignals;
        /// <summary>If set to true, all bus grouping will be expanded with the next drawing.</summary>
        internal bool ExpandAll;
        /// <summary>If set to true, all input signals will be available for drawing.</summary>
        internal bool IncludeInputs;
        /// <summary>If set to true, the pin numbers will be added to the signal names.</summary>
        internal bool DisplayPinNo;
        /// <summary>Reference to the font object used for the signal names.</summary>
        private Font NameFont;
        /// <summary>Reference to the font object used for the signal values.</summary>
        private Font ValueFont;
        /// <summary>Reference to the font object used for the signal values inside the signal graphs.</summary>
        private Font SignalFont;
        /// <summary>Reference to the font object used for the signal values inside the signal graphs when highlighted.</summary>
        private Font SignalFontHL;
        /// <summary>Reference to the format object used for centered strings.</summary>
        private StringFormat StringFormatCenter;
        /// <summary>Reference to the format object used for left aligned strings.</summary>
        private StringFormat StringFormatNear;
        /// <summary>Reference to the cursor marker.</summary>
        internal Marker CursorMarker;
        /// <summary>List of all current marker objects.</summary>
        internal List<Marker> Markers;
        /// <summary>Reference to the trigger marker.</summary>
        internal Marker TriggerMarker;

        /// <summary>Set to true, while the control key is pressed.</summary>
        private bool ControlKeyDown = false;
        /// <summary>Set to true, while the shift key is pressed.</summary>
        private bool ShiftKeyDown = false;
        /// <summary>Set to true, while the left mouse key is pressed in the signal name area.</summary>
        private bool SignalNameMouseDown = false;
        /// <summary>Y coordinate to insert the signal name.</summary>
        private int SignalNameInsertY = -1;
        /// <summary>Y coordinate in the signal name where the mouse key was pressed.</summary>
        private int SignalNameMouseDownY = -1;

        /// <summary>Reference to the LogView form object when open.</summary>
        internal frmLogView LogView;

        /// <summary>List of recently imported KiCad Netlist Files.</summary>
        internal List<string> RecentKiCadFiles;
        /// <summary>List of recently saved SimTTLFiles.</summary>
        internal List<string> RecentSimTTLFiles;
        #endregion GUI variables

        #region Signal Graph Colors
        /// <summary>Index for all drawing Colors, Pens ad Brushes. 0:Screen, 1 Printing</summary>
        private int drawIdx = 0;
        /// <summary>Color definition for background.</summary>
        private Color[] colorBackgr = new Color[] { Color.Black, Color.White };
        /// <summary>Definition of the pen object used for High and Low level standard drawing.</summary>
        private Pen[] penSignalHLstd = new Pen[] { new Pen(Color.FromArgb(100, 255, 100), 1), new Pen(Color.FromArgb(00, 100, 00), 2) };
        /// <summary>Definition of the pen object used for High and Low level selected signal drawing.</summary>
        private Pen[] penSignalHLsel = new Pen[] { new Pen(Color.FromArgb(150, 255, 150), 2), new Pen(Color.FromArgb(00, 150, 00), 2) };
        /// <summary>Definition of the pen object used for undefined level standard drawing.</summary>
        private Pen[] penSignalUstd = new Pen[] { new Pen(Color.FromArgb(255, 00, 00), 1), new Pen(Color.FromArgb(255, 00, 00), 2) };
        /// <summary>Definition of the pen object used for undefined level selected signal drawing.</summary>
        private Pen[] penSignalUsel = new Pen[] { new Pen(Color.FromArgb(255, 50, 50), 2), new Pen(Color.FromArgb(255, 50, 50), 2) };
        /// <summary>Definition of the pen object used for high impedance level standard drawing.</summary>
        private Pen[] penSignalZstd = new Pen[] { new Pen(Color.FromArgb(00, 00, 255), 1), new Pen(Color.FromArgb(00, 00, 255), 2) };
        /// <summary>Definition of the pen object used for high impedance level selected signal drawing.</summary>
        private Pen[] penSignalZsel = new Pen[] { new Pen(Color.FromArgb(50, 50, 255), 2), new Pen(Color.FromArgb(50, 50, 255), 2) };


        /// <summary>Definition of the brush object used for text background.</summary>
        private Brush[] brushBackgr = new SolidBrush[] { new SolidBrush(Color.Black), new SolidBrush(Color.White) };
        /// <summary>Definition of the brush object used for background when text is highlighted.</summary>
        private Brush[] brushBackgrSel = new SolidBrush[] { new SolidBrush(Color.LightGray), new SolidBrush(Color.LightGray) };

        /// <summary>Definition of the brush object used for text.</summary>
        private Brush[] brushText = new SolidBrush[] { new SolidBrush(Color.White), new SolidBrush(Color.Black) };
        /// <summary>Definition of the brush object used for highlighted text.</summary>
        private Brush[] brushTextSel = new SolidBrush[] { new SolidBrush(Color.Black), new SolidBrush(Color.Black) };
        /// <summary>Definition of the brush object used for text.</summary>
        private Brush[] brushGraphText = new SolidBrush[] { new SolidBrush(Color.White), new SolidBrush(Color.Black) };

        /// <summary>Definition of the brush object used for High and Low level standard drawing.</summary>
        private Brush[] brushSignalHLstd = new SolidBrush[] { new SolidBrush(Color.FromArgb(0, 50, 0)), new SolidBrush(Color.FromArgb(0, 200, 0)) };
        /// <summary>Definition of the brush object used for High and Low level selected signal drawing.</summary>
        private Brush[] brushSignalHLsel = new SolidBrush[] { new SolidBrush(Color.FromArgb(0, 80, 0)), new SolidBrush(Color.FromArgb(0, 250, 0)) };
        /// <summary>Definition of the brush object used for undefined level standard drawing.</summary>
        private Brush[] brushSignalUstd = new SolidBrush[] { new SolidBrush(Color.FromArgb(100, 0, 0)), new SolidBrush(Color.FromArgb(100, 0, 0)) };
        /// <summary>Definition of the brush object used for undefined level selected signal drawing.</summary>
        private Brush[] brushSignalUsel = new SolidBrush[] { new SolidBrush(Color.FromArgb(150, 0, 0)), new SolidBrush(Color.FromArgb(150, 0, 0)) };
        /// <summary>Definition of the brush object used for high impedance level standard drawing.</summary>
        private Brush[] brushSignalZstd = new SolidBrush[] { new SolidBrush(Color.FromArgb(0, 0, 150)), new SolidBrush(Color.FromArgb(0, 0, 150)) };
        /// <summary>Definition of the brush object used for high impedance level selected signal drawing.</summary>
        private Brush[] brushSignalZsel = new SolidBrush[] { new SolidBrush(Color.FromArgb(0, 0, 200)) , new SolidBrush(Color.FromArgb(0, 0, 200)) };

        /// <summary>Definition of the pen object used for markers.</summary>
        private Pen[] penMarker = new Pen[] { new Pen(Color.Blue, 1), new Pen(Color.Blue, 2) };
        /// <summary>Definition of the pen object used for highlighted.</summary>
        private Pen[] penMarkerSel = new Pen[] { new Pen(Color.LightBlue, 2), new Pen(Color.Blue, 2) };
        /// <summary>Definition of the pen object used for markers.</summary>
        private Pen[] penMarkerRect = new Pen[] { new Pen(Color.White, 1), new Pen(Color.Black, 2) };

        /// <summary>Definition of the brush object used for marker.</summary>
        private Brush[] brushMarkerText = new SolidBrush[] { new SolidBrush(Color.White), new SolidBrush(Color.White) };
        /// <summary>Definition of the brush object used for selected marker.</summary>
        private Brush[] brushMarkerTextSel = new SolidBrush[] { new SolidBrush(Color.Black), new SolidBrush(Color.White) };
        /// <summary>Definition of the brush object used for marker background.</summary>
        private Brush[] brushMarkerFill = new SolidBrush[] { new SolidBrush(Color.Blue), new SolidBrush(Color.Blue) };
        /// <summary>Definition of the brush object used for marker background selected.</summary>
        private Brush[] brushMarkerFillSel = new SolidBrush[] { new SolidBrush(Color.LightBlue), new SolidBrush(Color.Blue) };

        /// <summary>Definition of the pen object used for cursors.</summary>
        private Pen[] penCursor = new Pen[] { new Pen(Color.Yellow, 1), new Pen(Color.Yellow, 2) };
        /// <summary>Definition of the pen object used for highlighted cursors.</summary>
        private Pen[] penCursorSel = new Pen[] { new Pen(Color.LightYellow, 2), new Pen(Color.Yellow, 2) };

        /// <summary>Definition of the brush object used for marker.</summary>
        private Brush[] brushCursorText = new SolidBrush[] { new SolidBrush(Color.Black), new SolidBrush(Color.Black) };
        /// <summary>Definition of the brush object used for selected marker.</summary>
        private Brush[] brushCursorTextSel = new SolidBrush[] { new SolidBrush(Color.Black), new SolidBrush(Color.Black) };
        /// <summary>Definition of the brush object used for marker background.</summary>
        private Brush[] brushCursorFill = new SolidBrush[] { new SolidBrush(Color.Yellow), new SolidBrush(Color.Yellow) };
        /// <summary>Definition of the brush object used for marker background selected.</summary>
        private Brush[] brushCursorFillSel = new SolidBrush[] { new SolidBrush(Color.LightYellow), new SolidBrush(Color.Yellow) };

        /// <summary>Definition of the pen object used for cursors.</summary>
        private Pen[] penTrigger = new Pen[] { new Pen(Color.Red, 1), new Pen(Color.Red, 1) };
        /// <summary>Definition of the brush object used for trigger marker.</summary>
        private Brush[] brushTriggerText = new SolidBrush[] { new SolidBrush(Color.Black), new SolidBrush(Color.Black) };
        /// <summary>Definition of the brush object used for trigger marker filled.</summary>
        private Brush[] brushTriggerFill = new SolidBrush[] { new SolidBrush(Color.Red), new SolidBrush(Color.Red) };

        #endregion Signal Graph Colors

        #region Construction, opening and closing
        /// <summary>
        /// Creates the instance of the SimTTL main form.
        /// </summary>
        public frmMain()
        {
            InitializeComponent();
#if DEBUG_WRITE
            File.Delete(Application.StartupPath + "\\DebugLog.csv");
            Trace.Listeners.Add(new TextWriterTraceListener(Application.StartupPath + "\\DebugLog.csv"));
#endif
            SimulationMaxTime = 10000;
            SimulationContinueTime = SimulationMaxTime / 10;
            SignalsZoomX = 1;
            DisplayMinTime = 0;
            DisplayMaxTime = SimulationMaxTime;
            MouseX = -1;
            MouseY = -1;
            DataTime = -1;
            LastDataTime = -1;
            CursorMarker = new Marker();
            Markers = new List<Marker>();
            TriggerMarker = new Marker();
            LastSelectedSignal = null;
            LastSelectedSignalIdx = -1;
            NoOfSelectedSignals = 0;
            ExpandAll = false;
            IncludeInputs = false;
            DisplayPinNo = true;
            NameFont = new Font("Arial", NAME_FONT_SIZE, FontStyle.Regular);
            ValueFont = new Font("Arial", VALUE_FONT_SIZE, FontStyle.Regular);
            SignalFont = new Font("Arial", SIGNAL_FONT_SIZE, FontStyle.Regular);
            SignalFontHL = new Font("Arial", SIGNAL_FONT_SIZE, FontStyle.Bold);

            StringFormatCenter = new StringFormat();
            StringFormatCenter.Alignment = StringAlignment.Center;
            StringFormatNear = new StringFormat();
            StringFormatNear.Alignment = StringAlignment.Near;

            CurrentSignals = new List<DisplaySignal>();
            CurrentStimuli = new List<Stimulus>();
            CurrentTriggers = new List<Trigger>();

            RecentKiCadFiles = new List<string>();
            RecentSimTTLFiles = new List<string>();

            pbSignalNames.MouseWheel += SignalNames_MouseWheelEventHandler;
            pbSignalValues.MouseWheel += SignalNames_MouseWheelEventHandler;
        }

        /// <summary>
        /// Send the passed message string to the LogView form, if exists.
        /// </summary>
        /// <param name="Level">Indent level of the message. Negative values indicate error messages</param>
        /// <param name="Msg">Message string to be logged</param>
        private void LogMessage(int Level, string Msg)
        {
            if (LogView != null)
                LogView.Log(Level,Msg);
        }

        /// <summary>
        /// Create a schematics and load its contents from a given KiCad netlist, if the file exists.
        /// </summary>
        /// <param name="Name">Name of the schematics object to be created.</param>
        /// <param name="NetlistFileName">Full path and file name to the KiCad netlist to read.</param>
        private void LoadSchematicsFromNetlist(string Name, string NetlistFileName)
        {
            if (File.Exists(NetlistFileName))
            {
                SimulationTimeInterval = 10;
                SimulationMaxTime = 10000;
                SimulationContinueTime = SimulationMaxTime / 10;
                SignalsZoomX = 1;
                DisplayMinTime = 0;
                DisplayMaxTime = SimulationMaxTime;

                Schematics = new BaseSchematics(Name);
                Schematics.NetlistFileName = NetlistFileName;

                KiCAD_Netlist netlist = new KiCAD_Netlist(Schematics);
                netlist.SendString += LogMessage;
                LogView = new frmLogView(this);
                LogView.Show();

                netlist.LoadNetlist(NetlistFileName);
                netlist.LogNetList(Application.StartupPath + "\\NetlistImport.log");
                netlist.CreateSchematics(Application.StartupPath + "\\CreateSchematics.log", Application.StartupPath + "\\CreateSchematics_Errors.log");
                LogView.AllowClosing = true;
            }
            else MessageBox.Show("Netlist File \"" + NetlistFileName + "\" not found!");
        }

        /// <summary>
        /// Select one of the available hard coded schematics or load one from a KiCad netlist.
        /// </summary>
        /// <param name="SchematicsSource">Identifier for the source of this schematics.</param>
        /// <param name="Name">Name of the schematics object to be created.</param>
        /// <param name="NetlistFileName">Full path and file name to the KiCad netlist to read.</param>
        private void SelectCodedSchematics(SchematicsSource SchematicsSource, string Name, string NetlistFileName)
        {
            Schematics = null;
            switch (SchematicsSource)
            {
                case SchematicsSource.None:
                    break;

                case SchematicsSource.TestSchematics:
                    Schematics = new TestSchematics();
                    SimulationTimeInterval = 10;
                    SimulationMaxTime = 100000;
                    break;

                case SchematicsSource.BenEater8Bit:
                    Schematics = new BenEater8bit();
                    Schematics.LoadRomFile(Application.StartupPath + "\\BenEater8bit\\BenEater8BitComputer_CombinedROM.bin");
                    Schematics.LoadRamFile(Application.StartupPath + "\\BenEater8bit\\BenEater8BitComputer_TestPgm.bin");
                    SimulationTimeInterval = 10;
                    SimulationMaxTime = 100000;
                    break;

                case SchematicsSource.GigatronTTL:
                    Schematics = new Gigatron();
                    Schematics.LoadRomFile(Application.StartupPath + "\\GigatronTTL\\GigatronTTL_ROMv6.rom");
                    SimulationTimeInterval = 1;
                    SimulationMaxTime = 1000;
                    break;

                case SchematicsSource.NetlistImport:
                    if (File.Exists(NetlistFileName))
                        LoadSchematicsFromNetlist(Name, NetlistFileName);
                    break;

                case SchematicsSource.SimTTLFile:
                    break;
            }
            SimulationContinueTime = SimulationMaxTime / 10;

            if (Schematics != null)
            {
                Schematics.SchematicsSource = SchematicsSource;
                tsslSchematicsName.Text = Schematics.Name;
                Schematics.SimulationProgress += Schematics_SimulationProgress;
                LinkCurrentStimuli();
            }
            else
                Schematics = new BaseSchematics("");
        }

        /// <summary>
        /// Save the current schematics and its settings to the application XML files.
        /// </summary>
        private void SaveCurrentSettings()
        {
            if (Schematics == null)
                return;

            try
            {
                AppSettings.SchematicsSource = Schematics.SchematicsSource;
                AppSettings.SchematicsName = Schematics.Name;
                AppSettings.NetlistFileName = Schematics.NetlistFileName;
                AppSettings.SimulationTimeInterval = SimulationTimeInterval;
                AppSettings.SimulationMaxTime = SimulationMaxTime;
                AppSettings.SimulationContinueTime = SimulationContinueTime;
                AppSettings.EnableTrigger = Schematics.EnableTrigger;
                AppSettings.TriggerPosition = Schematics.TriggerPosition;
                AppSettings.SignalsZoomX = SignalsZoomX;
                AppSettings.SignalGraphsLocationX = -pbSignalGraphs.Location.X; //pnSignalGraphs.HorizontalScroll.Value;
                AppSettings.SignalGraphsLocationY = -pbSignalGraphs.Location.Y; //pnSignalGraphs.VerticalScroll.Value;
                AppSettings.DisplayMinTime = DisplayMinTime;
                AppSettings.DisplayMaxTime = DisplayMaxTime;
                AppSettings.ExpandAll = ExpandAll;
                AppSettings.IncludeInputs = IncludeInputs;
                AppSettings.DisplayPinNo = DisplayPinNo;
                AppSettings.AutoCloseImportForm = tsmiAutoCloseImportForm.Checked;
                AppSettings.CursorMarker = CursorMarker;
                AppSettings.Markers.Clear();
                AppSettings.Markers.AddRange(Markers);
                AppSettings.CurrentSignals.Clear();
                AppSettings.CurrentSignals.AddRange(CurrentSignals);
                AppSettings.CurrentStimuli.Clear();
                AppSettings.CurrentStimuli.AddRange(CurrentStimuli);
                AppSettings.CurrentTriggers.Clear();
                AppSettings.CurrentTriggers.AddRange(CurrentTriggers);
                AppSettings.RecentKiCadFiles.Clear();
                AppSettings.RecentKiCadFiles.AddRange(RecentKiCadFiles);
                AppSettings.RecentSimTTLFiles.Clear();
                AppSettings.RecentSimTTLFiles.AddRange(RecentSimTTLFiles);
                AppSettings.SaveSettings();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }

        /// <summary>
        /// Eventhandler called when the main form is shown. 
        /// This method loads the application settings saved before and restores the same contents as saved.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void frmMain_Shown(object sender, EventArgs e)
        {
            SignalsZoomX = CalcZoom(DisplayMinTime, DisplayMaxTime); 

            AppSettings = new AppSettings(Application.StartupPath + "\\SimTTL_AppSettings.xml");
            if (AppSettings.FileLoadedCorrectly)
            {
                try
                {
                    SelectCodedSchematics(AppSettings.SchematicsSource, AppSettings.SchematicsName, AppSettings.NetlistFileName);
                    LoadAppSettings();
                    if ((LogView != null) && (tsmiAutoCloseImportForm.Checked))
                        LogView.Close();
                    RunSimulation();
                    pnSignalGraphs.HorizontalScroll.Value = AppSettings.SignalGraphsLocationX;
                    pnSignalGraphs.VerticalScroll.Value = AppSettings.SignalGraphsLocationY;
                }
                catch (Exception ex) { MessageBox.Show(ex.Message); }
            }
            else tsmiLoadConfiguration_Click(null, null);
            //else
            //    FillSignalList(CurrentSignals);

            //RunSimulation();
        }

        /// <summary>
        /// Eventhandler called when the main form is closed.
        /// Save the schematics and its settings.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void frmMain_FormClosing(object sender, FormClosingEventArgs e)
        {
            SaveCurrentSettings();
        }
        #endregion Construction, opening and closing

        #region General Form Handling
        /// <summary>
        /// Eventhandler called when a key is pressed.
        /// Control and Shift status is captured.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void frmMain_KeyDown(object sender, KeyEventArgs e)
        {
            ControlKeyDown = e.Control;
            ShiftKeyDown = e.Shift;
            if (Schematics.SimulationActive && (e.KeyCode == Keys.Escape))
                Schematics.AbortSimulation = true;
        }

        /// <summary>
        /// Eventhandler called when a key is released.
        /// Control and Shift status is cleared.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void frmMain_KeyUp(object sender, KeyEventArgs e)
        {
            ControlKeyDown = false;
            ShiftKeyDown = false;
        }

        /// <summary>
        /// Set the global enable true or false and adjusts the cursor.
        /// </summary>
        /// <param name="Enable">True to enable or false to disable the Form.</param>
        private void SetEnabled(bool Enable)
        {
            this.Enabled = Enable;
            if (Enable)
                this.Cursor = Cursors.Default;
            else
                this.Cursor = Cursors.WaitCursor;
        }

        /// <summary>
        /// Update the simulation progress bar to the current percentage.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void Schematics_SimulationProgress(object sender, ProgressEventArgs e)
        {
            if (e.ActivityText != "")
            {
                tspbProgress.Visible = true;
                tsslActivity.Text = e.ActivityText;
                tsslActivity.Visible = true;
                tsslTime.Text = e.CurrentSimTime.ToString() + " ns";
                tsslTime.Visible = true;

                if (e.CurrentPosition > tspbProgress.Maximum)
                {
                    tspbProgress.Maximum = e.MaxPosition;
                    tspbProgress.Value = e.CurrentPosition;
                }
                else
                {
                    tspbProgress.Value = e.CurrentPosition;
                    tspbProgress.Maximum = e.MaxPosition;
                }
                ssStatus.Refresh();
                Application.DoEvents();
            }
            else
            {
                tspbProgress.Visible = false;
                tsslActivity.Text = "";
                tsslActivity.Visible = true;
                tsslTime.Text = "";
                tsslTime.Visible = true;
            }
        }


        #endregion General Form Handling

        #region Load Settings and Init Signals
        /// <summary>
        /// Load the application settings from the XML files previously saved.
        /// </summary>
        private void LoadAppSettings()
        {
            this.SimulationTimeInterval = AppSettings.SimulationTimeInterval;
            this.SimulationMaxTime = AppSettings.SimulationMaxTime;
            this.SimulationContinueTime = AppSettings.SimulationContinueTime;
            this.Schematics.EnableTrigger = AppSettings.EnableTrigger;
            this.Schematics.TriggerPosition = AppSettings.TriggerPosition;
            this.DisplayMinTime = AppSettings.DisplayMinTime;
            this.DisplayMaxTime = AppSettings.DisplayMaxTime;
            this.SignalsZoomX = AppSettings.SignalsZoomX;  
            this.pnSignalGraphs.HorizontalScroll.Value = 0;
            this.pnSignalGraphs.VerticalScroll.Value = 0;
            this.pbSignalGraphs.Location = new Point(0, 0);
            this.ExpandAll = AppSettings.ExpandAll;
            this.IncludeInputs = AppSettings.IncludeInputs;
            this.DisplayPinNo = AppSettings.DisplayPinNo;
            this.tsmiAutoCloseImportForm.Checked = AppSettings.AutoCloseImportForm;

            this.CursorMarker.Time = AppSettings.CursorMarker.Time;
            this.CursorMarker.Selected = AppSettings.CursorMarker.Selected;

            this.Markers.Clear();
            foreach (Marker marker in AppSettings.Markers)
            {
                Marker newMarker = new Marker();
                newMarker.Time = marker.Time;
                newMarker.Selected = marker.Selected;
                Markers.Add(newMarker);
            }
            CalcMarkerX();
            CurrentStimuli = Stimulus.CreateListCopy(AppSettings.CurrentStimuli);
            CurrentTriggers.Clear();
            for (int i = 0; i < AppSettings.CurrentTriggers.Count; i++)
            {
                DisplaySignal ds = CreateLinkedDisplaySignal(AppSettings.CurrentTriggers[i].SignalName);
                if (ds != null)
                {
                    Trigger trg = new Trigger(AppSettings.CurrentTriggers[i].SignalName,
                                              AppSettings.CurrentTriggers[i].Bits,
                                              AppSettings.CurrentTriggers[i].Condition,
                                              AppSettings.CurrentTriggers[i].CompareValue,
                                              AppSettings.CurrentTriggers[i].CompareValueStr,
                                              AppSettings.CurrentTriggers[i].Logic,
                                              ds.Element, ds.Pins);
                    CurrentTriggers.Add(trg);
                }

            }
            if (Schematics != null)
                Schematics.Triggers = CurrentTriggers;

            RecentKiCadFiles.Clear();
            RecentKiCadFiles.AddRange(AppSettings.RecentKiCadFiles);
            RecentSimTTLFiles.Clear();
            RecentSimTTLFiles.AddRange(AppSettings.RecentSimTTLFiles);

            LinkCurrentStimuli();
            CountSelectedSignals();
            LoadSignalListFromSettings();
        }


        /// <summary>
        /// Find the element matching the screen name and return a DisplaySignal object linked to it.
        /// </summary>
        /// <param name="ScreenName">Screen name of the display signal to be created.</param>
        /// <returns>DisplaySignal object linked to the found element or null.</returns>
        public DisplaySignal CreateLinkedDisplaySignal(string ScreenName)
        {
            foreach (BaseElement element in Schematics.Elements)
            {
                for (int i = 0; i < element.Inputs.Length; i++)
                {
                    bool special = (element is SignalBus) || (element is SignalLabel);
                    string screenName = (element.Name + "." + DisplaySignal.GetBusName(element.Inputs[i])).Trim(new char[] { '.' });
                    if (screenName == ScreenName)
                        return new DisplaySignal(element, element.Inputs[i], screenName, !special);
                }

                for (int i = 0; i < element.Outputs.Length; i++)
                {
                    string screenName = (element.Name + "." + DisplaySignal.GetBusName(element.Outputs[i])).Trim(new char[] { '.' });
                    if (screenName == ScreenName)
                        return new DisplaySignal(element, element.Outputs[i], screenName, false);
                }
            }
            return null;
        }


        /// <summary>
        /// Load the list of selected signals from the AppSettings object.
        /// </summary>
        private void LoadSignalListFromSettings()
        {
            CurrentSignals.Clear();
            foreach (DisplaySignal signal in AppSettings.CurrentSignals)
            {
                DisplaySignal ds = CreateLinkedDisplaySignal(signal.ScreenName);
                if (ds != null)
                {
                    ds.Radix = signal.Radix;
                    ds.Invert = signal.Invert;
                    ds.Reverse = signal.Reverse;
                    ds.Expanded = signal.Expanded;
                    ds.Highlight = signal.Highlight;
                    CurrentSignals.Add(ds);
                }
            }
        }

        /// <summary>
        /// Link stimulus elements to inputs of the signal list.
        /// </summary>
        private void LinkCurrentStimuli()
        {
            // disconnect all stimuli pins
            foreach (BaseElement element in Schematics.Elements)
            {
                for (int i = 0; i < element.Inputs.Length; i++)
                    foreach (Pin pin in element.Inputs[i])
                        if ((pin.ConnectedNet != null) && (pin.ConnectedNet.ConnectedPins != null))
                            for (int j = pin.ConnectedNet.ConnectedPins.Count - 1; j >= 0; j--)
                            {
                                if (pin.ConnectedNet.ConnectedPins[j].Owner is Stimulus)
                                    pin.ConnectedNet.ConnectedPins.RemoveAt(j);
                            }
            }
            // remove all previous stimulus objects
            for (int i=Schematics.Elements.Count-1; i>=0; i--)
            {
                if (Schematics.Elements[i] is Stimulus)
                    Schematics.Elements.RemoveAt(i);
            }

            // Add new stimuli
            if ((CurrentStimuli != null) && (CurrentStimuli.Count > 0))
            {
                List<Stimulus> stimuli = Stimulus.CreateListCopy(CurrentStimuli);
                Schematics.Elements.AddRange(stimuli);

                foreach (BaseElement element in Schematics.Elements)
                    for (int i = 0; i < element.Inputs.Length; i++)
                    {
                        string screenName = (element.Name + "." + DisplaySignal.GetBusName(element.Inputs[i])).Trim(new char[] { '.' });
                        foreach (Stimulus stimulus in stimuli)
                        {
                            if (stimulus.SignalName == screenName)
                            {
                                for (int j = 0; j < element.Inputs[i].Length; j++)
                                {
                                    if ((element.Inputs[i][j].ConnectedNet != null) && (element.Inputs[i][j].ConnectedNet.ConnectedPins != null))
                                        element.Inputs[i][j].ConnectedNet.ConnectedPins.Add(stimulus.Pins[j]);
                                }
                            }
                        }
                    }
            }
        }

        /// <summary>
        /// Fill the SignalList with all available signals depending on the global IncludeInputs flag.
        /// </summary>
        /// <param name="SignalList">Reference to the list object to be filled.</param>
        private void FillSignalList(List<DisplaySignal> SignalList)
        {
            FillSignalList(SignalList, IncludeInputs, true, true);
        }

        /// <summary>
        /// Fill the SignalList with all available signals depending on the IncludeAllInputs flag and IncludeAllInputs flag.
        /// </summary>
        /// <param name="SignalList">Reference to the list object to be filled.</param>
        /// <param name="IncludeAllInputs">If true, all signals identified as inputs will be included in the list.</param>
        /// <param name="LabelsOnly">If true, only labeled signals are included.</param>
        /// <param name="IncludeAllOutputs">If true, outputs will </param>
        private void FillSignalList(List<DisplaySignal> SignalList, bool IncludeAllInputs, bool LabelsOnly, bool IncludeAllOutputs)
        {
            SignalList.Clear();
            foreach (BaseElement element in Schematics.Elements)
            {
                bool special = (element is SignalBus) || (element is SignalLabel);
                if ((IncludeAllInputs == true) || special)
                    for (int i = 0; i < element.Inputs.Length; i++)
                    {
                        string screenName = (element.Name + "." + DisplaySignal.GetBusName(element.Inputs[i])).Trim(new char[] { '.' });
                        SignalList.Add(new DisplaySignal(element, element.Inputs[i], screenName, !special));
                    }

                if (IncludeAllOutputs && ((LabelsOnly == false) || (element is SignalLabel)))
                {
                    for (int i = 0; i < element.Outputs.Length; i++)
                    {
                        string screenName = (element.Name + "." + DisplaySignal.GetBusName(element.Outputs[i])).Trim(new char[] { '.' });
                        SignalList.Add(new DisplaySignal(element, element.Outputs[i], screenName, false));
                    }
                }
            }
        }
        #endregion Load Settings and Init Signals

        #region Calculations and Conversions
        /// <summary>
        /// Calculate the zoom factor from the minimum and maximum time.
        /// </summary>
        /// <param name="MinTime">Minimum time corresponding to the left side of the signal graph area.</param>
        /// <param name="MaxTime">Maximum time corresponding to the right side of the signal graph area.</param>
        /// <returns>Calculated zoom factor to fit the signal area.</returns>
        private double CalcZoom(double MinTime, double MaxTime)
        {
            if (MaxTime <= MinTime)
                return 1;

            return (pnSignalGraphs.ClientSize.Width - MARGIN_LEFT - MARGIN_RIGHT - VSCROLL_BAR_WIDTH) / (MaxTime - MinTime);
        }

        /// <summary>
        /// Time to string conversion.
        /// </summary>
        /// <param name="Time">Time value to convert.</param>
        /// <returns>String converted from Time value.</returns>
        private string Time2Str(double Time)
        {
            string s = Math.Round(Time).ToString("N");
            return s.Substring(0,s.Length-3)+"ns";
        }

        /// <summary>
        /// Time to X-coordinate conversion.
        /// </summary>
        /// <param name="Time">Time value to convert.</param>
        /// <returns>X-coordinate calculated from the time value.</returns>
        private float Time2X(double Time)
        {
            return (float)(MARGIN_LEFT + (Time - DisplayMinTime) * SignalsZoomX);
        }

        /// <summary>
        /// X-coordinate to time conversion.
        /// </summary>
        /// <param name="X">X-coordinate to convert.</param>
        /// <returns>Time value calculated form the X-coordinate.</returns>
        private double X2Time(float X)
        {
            return Math.Min(Math.Max((((X - MARGIN_LEFT) / SignalsZoomX) + DisplayMinTime), 0), SimulationMaxTime);
        }


        /// <summary>
        /// Calculate the the minimum required bitmap height to fit all signals depending on the ExpandAll flag.
        /// </summary>
        /// <param name="ExpandAll">If true, all bus signals will be expanded. if false, only the ones marked will be expanded.</param>
        /// <returns>Minimum bitmap height needed to fit the signals.</returns>
        private int GetBitmapMinHeight(bool ExpandAll)
        {
            int n = 1;
            foreach (DisplaySignal ns in CurrentSignals)
            {
                if ((ExpandAll == true) || (ns.Expanded == true))
                    n += ns.DisplayPins.Length;
                else
                    n++;
            }
            n += 5;
            return Math.Min(n * VERTICAL_STEP + MARGIN_TOP + MARGIN_BOTTOM, ushort.MaxValue);
        }

        /// <summary>
        /// Calculate the the required bitmap height to fit all signals depending on the ExpandAll flag.
        /// </summary>
        /// <param name="ExpandAll">If true, all bus signals will be expanded. if false, only the ones marked will be expanded.</param>
        /// <returns>Bitmap height needed to fit the signals.</returns>
        private int GetBitmapHeight(bool ExpandAll)
        {
            int h = GetBitmapMinHeight(ExpandAll);
            return Math.Max(h, pnSignalGraphs.ClientSize.Height);
        }

        /// <summary>
        /// Calculates the required width for fitting the signal graphs between DisplayMinTime and DisplayMaxTime for the current SiglasZoomX.
        /// </summary>
        /// <returns>Bitmap width required to fit.</returns>
        private int GetBitmapWidth()
        {
            int w = Math.Min((int)((DisplayMaxTime - DisplayMinTime + 1) * SignalsZoomX + MARGIN_LEFT + MARGIN_RIGHT), short.MaxValue);
            return Math.Max(w, pnSignalGraphs.ClientSize.Width);
        }
        #endregion Calculations and Conversions

        #region Display Updates
        /// <summary>
        /// Update SignalName, SignalValue and SignalGraph for the requested index i in the list of current signals CurrentSignals.
        /// </summary>
        /// <param name="i">Index into the current signal list CurrentSignals.</param>
        private void UpdateSignal(int i)
        {
            DisplaySignalName(bmSignalNames, pbSignalNames, i);
            int usedWith = 0;
            DisplaySignalValue(bmSignalValues, pbSignalValues, CursorMarker.Time >= 0 ? CursorMarker.Time : DataTime, i, ref usedWith);
            DisplaySignalGraph(bmSignalGraphs, pbSignalGraphs, i);
        }

        /// <summary>
        /// Update all signals as names, values and graphs.
        /// </summary>
        private void UpdateDisplays()
        {
            DisplaySignalNames(ref bmSignalNames, pbSignalNames);
            DisplaySignalValues(ref bmSignalValues, pbSignalValues, CursorMarker.Time >= 0 ? CursorMarker.Time : DataTime);
            DisplaySignalGraphs(ref bmSignalGraphs, pbSignalGraphs);
            DisplaySignalGraphRuler(ref bmSignalGraphRuler, pbSignalGraphRuler);
        }

        /// <summary>
        /// Run the simulation to the SimulationMaxTime with the selected time step in the SimulationTimeInterval variable and update all signals on the screen.
        /// </summary>
        private void RunSimulation()
        {
            SetEnabled(false);

            if ((Schematics.Time == 0) || (SimulationTimeInterval != Schematics.TimeInterval))
                Schematics.SimulateFromStart(SimulationTimeInterval, SimulationMaxTime);
            else if (SimulationMaxTime > Schematics.Time)
                Schematics.ContinueSimulation(SimulationMaxTime);
            else if (SimulationMaxTime < Schematics.MaxTime)
                Schematics.ShortenSimulation(SimulationMaxTime);

            if (Schematics.TriggerOccured)
            {
                TriggerMarker.Time = Schematics.TriggerTime;
                TriggerMarker.X=(int)Time2X(TriggerMarker.Time);
            }
            else
            {
                TriggerMarker.Time = -1;
                TriggerMarker.X = -1;
            }

            label3.Text = Schematics.SimRunTime.ToString("F3");
            UpdateDisplays();
            SetEnabled(true);
        }
        #endregion Display Updates

        #region Marker handling
        /// <summary>
        /// Find the marker close enough to the passed x-coordinate and return the reference to it.
        /// </summary>
        /// <param name="X">X-coordinate to check.</param>
        /// <returns>Reference to a close marker or null if none is in grab distance.</returns>
        private Marker FindCloseMarker(int X)
        {
            if ((CursorMarker.X >= 0) && (Math.Abs(X - CursorMarker.X) < MARKER_GRAB_RANGE))
                return CursorMarker;

            for (int i = 0; Markers.Count > i; i++)
                if (Math.Abs(X - Markers[i].X) < MARKER_GRAB_RANGE)
                    return Markers[i];
            return null;
        }

        /// <summary>
        /// Find the currently marker that is currently marked as moving.
        /// </summary>
        /// <returns>Reference to the marker that is currently marked as moving or null if none.</returns>
        private Marker FindMovingMarker()
        {
            if (CursorMarker.Moving)
                return CursorMarker;

            for (int i = 0; Markers.Count > i; i++)
                if (Markers[i].Moving)
                    return Markers[i];

            return null;
        }

        /// <summary>
        /// Clear all marker's Moving field.
        /// </summary>
        private void ClearMarkerMoving()
        {
            CursorMarker.Moving = false;
            for (int i = 0; Markers.Count > i; i++)
                Markers[i].Moving = false;
        }

        /// <summary>
        /// Clear all marker's Selected field.
        /// </summary>
        private void ClearMarkerSelected()
        {
            CursorMarker.Selected = false;
            for (int i = 0; Markers.Count > i; i++)
                Markers[i].Selected = false;
        }

        /// <summary>
        /// Calculate the x-corrdinate for each marker from their time values.
        /// </summary>
        private void CalcMarkerX()
        {
            if (CursorMarker.Time >= 0)
                CursorMarker.X = (int)Time2X(CursorMarker.Time);
            else
                CursorMarker.X = -1;

            tsbGotoCursor.Enabled = CursorMarker.Time >= 0;

            for (int i = 0; Markers.Count > i; i++)
                if (Markers[i].Time >= 0)
                    Markers[i].X = (int)Time2X(Markers[i].Time);
                else
                    Markers[i].X = -1;

            if (TriggerMarker.Time >= 0)
                TriggerMarker.X = (int)Time2X(TriggerMarker.Time);
            else
                TriggerMarker.X = -1;

            tsbPrevMarker.Enabled = Markers.Count > 0;
            tsbNextMarker.Enabled = Markers.Count > 0;
            tsbDeleteAllMarkers.Enabled = Markers.Count > 0;
        }

        /// <summary>
        ///  Calculate the time value for each marker from their x-corrdinate.
        /// </summary>
        private void CalcMarkerTime()
        {
            if (CursorMarker.X >= 0)
                CursorMarker.Time = X2Time(CursorMarker.X);
            else
                CursorMarker.Time = -1;

            tsbGotoCursor.Enabled = CursorMarker.X >= 0;

            for (int i = 0; Markers.Count > i; i++)
                if (Markers[i].X >= 0)
                    Markers[i].Time = X2Time(Markers[i].X);
                else
                    Markers[i].Time = -1;

            tsbPrevMarker.Enabled = Markers.Count > 0;
            tsbNextMarker.Enabled = Markers.Count > 0;
            tsbDeleteAllMarkers.Enabled = Markers.Count > 0;
        }
        #endregion Marker handling

        #region Signal Selection etc
        /// <summary>
        /// Set the Selected field of all signals to the value passed in Sel and update the NoOfSelectedSignals field.
        /// </summary>
        /// <param name="Sel">Value to set the Selected fields to.</param>
        private void SetAllSignalSelects(bool Sel)
        {
            if (Sel == false)
            {
                LastSelectedSignal = null;
                LastSelectedSignalIdx = -1;
                NoOfSelectedSignals = 0;
            }
            else
                NoOfSelectedSignals = CurrentSignals.Count;

            for (int i = 0; i < CurrentSignals.Count; i++)
            {
                CurrentSignals[i].Moved = false;
                if (CurrentSignals[i].Selected != Sel)
                {
                    CurrentSignals[i].Selected = Sel;
                    for (int j = 0; j < CurrentSignals[i].DisplayPins.Length; j++)
                        CurrentSignals[i].DisplayPins[j].Selected = Sel;

                    UpdateSignal(i);
                }
            }
        }


        /// <summary>
        /// Count the number of currently selected signals and update the NoOfSelectedSignals field and related tool buttons.
        /// </summary>
        private void CountSelectedSignals()
        {
            int n = 0;
            for (int i = 0; i < CurrentSignals.Count; i++)
            {
                CurrentSignals[i].Moved = false;
                if (CurrentSignals[i].Selected == true)
                    n++;
            }
            NoOfSelectedSignals = n;
            tsbUnselectAll.Enabled = n > 0;
            tsbPrevTransistion.Enabled = n > 0;
            tsbNextTransition.Enabled = n > 0;
            tsbDeleteSelected.Enabled = n > 0;
        }

        /// <summary>
        /// Build a list of indices of all selected signals.
        /// </summary>
        /// <returns>List of indices into the CurrentSignals list.</returns>
        private List<int> GetSelectedSignalIndices()
        {
            List<int> indices = new List<int>();
            for (int i = 0; i < CurrentSignals.Count; i++)
            {
                CurrentSignals[i].Moved = false;
                if (CurrentSignals[i].Selected == true)
                    indices.Add(i);
            }
            return indices;
        }

        /// <summary>
        /// Return the signal that includes the passed Y-coordinate in its name text dimensions.
        /// </summary>
        /// <param name="Y">Y-coordinate to check.</param>
        /// <returns>Reference to the signal object that fits the y-coordinate or null</returns>
        private DisplayElement GetDisplaySignal(int Y)
        {
            Point p = new Point(1, Y);
            for (int i = 0; i < CurrentSignals.Count; i++)
            {
                Rectangle rect = new Rectangle(0, CurrentSignals[i].TextRect.Y, int.MaxValue, CurrentSignals[i].TextRect.Height);
                if (rect.Contains(p))
                {
                    return CurrentSignals[i];
                }
            }
            return null;
        }

        /// <summary>
        /// Sets the Selected field of the signal that fit the y-coordinate to the value passed in Sel.
        /// </summary>
        /// <param name="Y">Y-coordinate to check.</param>
        /// <param name="Sel">Value to set Selected field to.</param>
        /// <returns>Index of the found signal or -1 if none had been identified.</returns>
        private int SetSelectedSignal(int Y, bool Sel)
        {
            Point p = new Point(1, Y);
            for (int i = 0; i < CurrentSignals.Count; i++)
            {
                Rectangle rect = new Rectangle(0, CurrentSignals[i].TextRect.Y, int.MaxValue, CurrentSignals[i].TextRect.Height);
                if (rect.Contains(p))
                {
                    if (CurrentSignals[i].Selected == !Sel)
                    {
                        LastSelectedSignal = CurrentSignals[i];
                        LastSelectedSignalIdx = i;
                        CurrentSignals[i].Selected = Sel;
                        UpdateSignal(i);
                    }
                    CountSelectedSignals();
                    return i;
                }
                for (int j = 0; j < CurrentSignals[i].DisplayPins.Length; j++)
                {
                    rect = new Rectangle(0, CurrentSignals[i].DisplayPins[j].TextRect.Y, int.MaxValue, CurrentSignals[i].DisplayPins[j].TextRect.Height);
                    if (rect.Contains(p))
                    {
                        if (CurrentSignals[i].DisplayPins[j].Selected == !Sel)
                        {
                            LastSelectedSignal = CurrentSignals[i].DisplayPins[j];
                            LastSelectedSignalIdx = i;
                            CurrentSignals[i].DisplayPins[j].Selected = Sel;
                            if (j == 0)
                            {
                                UpdateSignal(i);
                            }
                        }
                        CountSelectedSignals();
                        return i;
                    }
                }
            }
            if ((LastSelectedSignal != null) && (Sel == false))
            {
                LastSelectedSignal = null;
                LastSelectedSignalIdx = -1;
            }
            CountSelectedSignals();
            return -1;
        }

        #endregion Signal Selection etc

        #region Display Signal Names
        /// <summary>
        /// Display all signal names by drawing them into the bmNames bitmap.
        /// <param name="bmNames">Reference to the Bitmap to draw to.</param>
        /// <param name="pbNames">Reference to the PictureBox object where bmNames is assigned.</param>
        /// <return>Used width.</return>
        /// </summary>
        private int DisplaySignalNames(ref Bitmap bmNames, PictureBox pbNames)
        {
            int usedWidth = 0;
            int h = GetBitmapHeight(ExpandAll);
            if ((bmNames == null) || (h != bmNames.Height))
            {
                bmNames = new Bitmap(pbSignalNames.ClientSize.Width, h);
                if (pbNames != null)
                    pbNames.Image = bmNames;
            }
            Graphics grfx = Graphics.FromImage(bmNames);
            int y = TEXT_TOP;
            grfx.Clear(colorBackgr[drawIdx]);
            for (int i = 0; i < CurrentSignals.Count; i++)
            {
                string s = CurrentSignals[i].ScreenName;
                if ((CurrentSignals[i].DisplayPins.Length == 1) && (DisplayPinNo && (CurrentSignals[i].DisplayPins[0].Pin.PinNo != "")))
                    s += " #" + CurrentSignals[i].DisplayPins[0].Pin.PinNo.ToString();

                SizeF size = grfx.MeasureString(s, NameFont);
                usedWidth = Math.Max(usedWidth, (int)size.Width + TEXT_LEFT + MARGIN_RIGHT);
                CurrentSignals[i].TextRect = new Rectangle(MARGIN_LEFT, y, bmNames.Width - TEXT_LEFT + MARGIN_RIGHT, (int)size.Height);
                //CurrentSignals[i].TextRect = new Rectangle(MARGIN_LEFT, y, (int)size.Width + TEXT_LEFT - MARGIN_LEFT, (int)size.Height);
                y = DisplaySignalName(grfx, i);
            }

            if (pbNames != null)
                pbNames.Refresh();

            return usedWidth;
        }

        /// <summary>
        /// Draw a single signal name indexed by the variable i to the passed graphics object.
        /// </summary>
        /// <param name="grfx">Reference to the graphics object to draw to.</param>
        /// <param name="i">Index of the signal in the CurrentSignals list.</param>
        /// <returns>Return the y-coordinate for the next signal to be drawn.</returns>
        private int DisplaySignalName(Graphics grfx, int i)
        {
            return DisplaySignalName(grfx, i, false);
        }

        /// <summary>
        /// Draw a single signal name indexed by the variable i to the bmNames bitmap.
        /// </summary>
        /// <param name="i">Index of the signal in the CurrentSignals list.</param>
        /// <param name="bmNames">Reference to the Bitmap to draw to.</param>
        /// <param name="pbNames">Reference to the PictureBox object where bmNames is assigned.</param>
        /// <returns>Return the y-coordinate for the next signal to be drawn.</returns>
        private int DisplaySignalName(Bitmap bmNames, PictureBox pbNames, int i)
        {
            int y = DisplaySignalName(Graphics.FromImage(bmNames), i, true);
            if (pbNames != null)
                pbNames.Invalidate();
            return y;
        }

        /// <summary>
        /// Draw a single signal name indexed by the variable i to the passed graphics object.
        /// </summary>
        /// <param name="grfx">Reference to the graphics object to draw to.</param>
        /// <param name="i">Index of the signal in the CurrentSignals list.</param>
        /// <param name="Clear">If true, the background will be cleared before drawing.</param>
        /// <returns>Return the y-coordinate for the next signal to be drawn.</returns>
        private int DisplaySignalName(Graphics grfx, int i, bool Clear)
        {
            int y = CurrentSignals[i].TextRect.Y;
            string pinNoStr = "";
            if (CurrentSignals[i].DisplayPins.Length > 1)
            {
                if ((ExpandAll == true) || (CurrentSignals[i].Expanded == true))
                    grfx.DrawString("-", NameFont, Brushes.White, MARGIN_LEFT, y);
                else
                    grfx.DrawString("+", NameFont, Brushes.White, MARGIN_LEFT, y);
            }
            else if (DisplayPinNo && (CurrentSignals[i].DisplayPins[0].Pin.PinNo != ""))
                pinNoStr = " #"+CurrentSignals[i].DisplayPins[0].Pin.PinNo.ToString();

            string s = CurrentSignals[i].ScreenName + pinNoStr;
            if (CurrentSignals[i].SelOrHigh == true)
            {
                grfx.FillRectangle(brushBackgrSel[drawIdx], TEXT_LEFT, CurrentSignals[i].TextRect.Y, CurrentSignals[i].TextRect.Width, CurrentSignals[i].TextRect.Height);
                grfx.DrawString(s, NameFont, brushTextSel[drawIdx], TEXT_LEFT, y);
            }
            else
            {
                if (Clear)
                    grfx.FillRectangle(brushBackgr[drawIdx], TEXT_LEFT, CurrentSignals[i].TextRect.Y, CurrentSignals[i].TextRect.Width, CurrentSignals[i].TextRect.Height);

                grfx.DrawString(s, NameFont, brushText[drawIdx], TEXT_LEFT, y);
            }

            y += VERTICAL_STEP;

            if ((CurrentSignals[i].DisplayPins.Length > 1) && ((ExpandAll == true) || (CurrentSignals[i].Expanded == true)))
            {
                for (int j = 0; j < CurrentSignals[i].DisplayPins.Length; j++)
                {
                    s = CurrentSignals[i].DisplayPins[j].Pin.LongName;
                    if (DisplayPinNo && (CurrentSignals[i].DisplayPins[j].Pin.PinNo != ""))
                            s += " #" + CurrentSignals[i].DisplayPins[j].Pin.PinNo.ToString();

                    SizeF size = grfx.MeasureString(s, NameFont);
                    CurrentSignals[i].DisplayPins[j].TextRect = new Rectangle(MARGIN_LEFT, y, (int)size.Width + TEXT_INDENT_LEFT - MARGIN_LEFT, (int)size.Height);
                    if (CurrentSignals[i].DisplayPins[j].SelOrHigh == true)
                    {
                        grfx.FillRectangle(brushBackgrSel[drawIdx], TEXT_LEFT, CurrentSignals[i].DisplayPins[j].TextRect.Y, CurrentSignals[i].DisplayPins[j].TextRect.Width, CurrentSignals[i].DisplayPins[j].TextRect.Height);
                        grfx.DrawString(s, NameFont, brushTextSel[drawIdx], TEXT_INDENT_LEFT, y);
                    }
                    else
                    {
                        if (Clear)
                            grfx.FillRectangle(brushBackgr[drawIdx], TEXT_LEFT, CurrentSignals[i].DisplayPins[j].TextRect.Y, CurrentSignals[i].DisplayPins[j].TextRect.Width, CurrentSignals[i].DisplayPins[j].TextRect.Height);

                        grfx.DrawString(s, NameFont, brushText[drawIdx], TEXT_INDENT_LEFT, y);
                    }
                    y += VERTICAL_STEP;
                }
            }
            else for (int j = 0; j < CurrentSignals[i].DisplayPins.Length; j++)
                    CurrentSignals[i].DisplayPins[j].TextRect = new Rectangle(-1, -1, 0, 0);

            return y;
        }
        #endregion Display Signal Names

        #region Signal Name Event Handlers
        /// <summary>
        /// MouseDown event handler for the signal name picture box.
        /// This handler will select or deselect a signal under the mouse coordinate or expand or collapse a signal group.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void pbSignalNames_MouseDown(object sender, MouseEventArgs e)
        {
            if (e.X >= TEXT_LEFT)
            {
                DisplayElement dispElement = GetDisplaySignal(e.Y);
                if ((ControlKeyDown == false) && (ShiftKeyDown == false) && (dispElement != null) && (dispElement.Selected == false))
                    SetAllSignalSelects(false);

                if ((ShiftKeyDown == true) && (dispElement != null) && (LastSelectedSignal != null))
                {
                    bool select = false;
                    for (int i = 0; i < CurrentSignals.Count; i++)
                    {
                        if (select == true)
                            CurrentSignals[i].Selected = true;

                        if ((CurrentSignals[i] == LastSelectedSignal) || (CurrentSignals[i] == dispElement))
                        {
                            if (select == false)
                            {
                                select = true;
                                CurrentSignals[i].Selected = true;
                            }
                            else
                                break;
                        }
                    }
                    UpdateDisplays();
                    //CountSelectedSignals();
                }
                else
                {
                    if (e.Button == MouseButtons.Left)
                        SetSelectedSignal(e.Y, true);
                    else
                        pbSignalValues_MouseDown(sender, e);
                }
                SignalNameMouseDown = e.Button == MouseButtons.Left;
                SignalNameMouseDownY = e.Y;
                return;
            }

            if (ExpandAll)
                return;

            for (int i = 0; i < CurrentSignals.Count; i++)
            {
                if (CurrentSignals[i].TextRect.Contains(e.Location))
                {
                    if (CurrentSignals[i].Expandable)
                    {
                        CurrentSignals[i].Expanded = !CurrentSignals[i].Expanded;
                        UpdateDisplays();
                        return;
                    }
                }
            }
        }

        /// <summary>
        /// MouseMove event handler for the signal name picture box.
        /// This handler will prepares moving a signal or signal group displaying a horizontal line where the signal(s) will be moved to.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void pbSignalNames_MouseMove(object sender, MouseEventArgs e)
        {
            if ((SignalNameMouseDown == true) && (NoOfSelectedSignals>0))
            {
                SignalNameInsertY = CurrentSignals[CurrentSignals.Count - 1].TextRect.Bottom + (VERTICAL_STEP - SIGNAL_HEIGHT) / 2;
                for (int i = 0; i < CurrentSignals.Count; i++)
                {
                    if (e.Y < CurrentSignals[i].TextRect.Bottom)
                    {
                        SignalNameInsertY = CurrentSignals[i].TextRect.Y - (VERTICAL_STEP - SIGNAL_HEIGHT)/2;
                        break;
                    }
                }
                pbSignalNames.Refresh();
            }
        }

        /// <summary>
        /// MouseLeave event handler for the signal name picture box.
        /// This handler aborts any moving or selection action started before..
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void pbSignalNames_MouseLeave(object sender, EventArgs e)
        {
            SignalNameMouseDown = false;
            SignalNameMouseDownY = -1;
            SignalNameInsertY = -1;
            pbSignalNames.Refresh();
        }

        /// <summary>
        /// MouseUp event handler for the signal name picture box.
        /// This handler will finishes any started selection process or move.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void pbSignalNames_MouseUp(object sender, MouseEventArgs e)
        {
            if ((SignalNameMouseDown == true) && (NoOfSelectedSignals > 0) && (Math.Abs(e.Y-SignalNameMouseDownY) > 5))
            {
                int insIdx;
                for (insIdx = 0; insIdx < CurrentSignals.Count; insIdx++)
                {
                    if (e.Y < CurrentSignals[insIdx].TextRect.Bottom)
                        break;
                }
                int movIdx = 0;
                do
                {
                    if ((CurrentSignals[movIdx].Selected == true) && (CurrentSignals[movIdx].Moved == false))
                    {
                        DisplaySignal movSignal = CurrentSignals[movIdx];
                        if (movIdx < insIdx)
                        {
                            CurrentSignals.RemoveAt(movIdx);
                            CurrentSignals.Insert(insIdx-1, movSignal);
                            movSignal.Moved = true;
                        }
                        else if (movIdx > insIdx)
                        {
                            CurrentSignals.RemoveAt(movIdx);
                            CurrentSignals.Insert(insIdx++, movSignal);
                            movSignal.Moved = true;
                        }
                        else movIdx++;
                    }
                    else movIdx++;

                }while (movIdx < CurrentSignals.Count);

                UpdateDisplays();
            }
            SignalNameMouseDown = false;
            SignalNameMouseDownY = -1;
            SignalNameInsertY = -1;
            pbSignalNames.Refresh();
        }

        /// <summary>
        /// Paint event handler for the signal name picture box.
        /// This handler will draw selection lines or the line to move to.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void pbSignalNames_Paint(object sender, PaintEventArgs e)
        {
            if ((MouseX >= 0) && (MouseY >= 0))
            {
                Graphics grfx = e.Graphics;
                Pen pen = new Pen(Color.FromArgb(63, 255, 255, 255), 1);
                grfx.DrawLine(pen, 0, MouseY, pbSignalGraphs.ClientSize.Width - 1, MouseY);
            }

            if ((SignalNameMouseDown == true) && (SignalNameInsertY >= 0))
            {
                Graphics grfx = e.Graphics;
                Pen pen = new Pen(Color.FromArgb(63, 255, 255, 255), 2);
                grfx.DrawLine(pen, 0, SignalNameInsertY, pbSignalGraphs.ClientSize.Width - 1, SignalNameInsertY);
            }
        }


        #endregion Signal Name Event Handlers

        #region Display Signal Values
        /// <summary>
        /// Get a one character string to be displayed as signal value. 
        /// </summary>
        /// <param name="State">Signal state.</param>
        /// <returns>String representing the signal state.</returns>
        private string GetValueStr(SignalState State, bool Invert)
        {
            if (Invert)
            {
                if (State == SignalState.L)
                    return "1";
                if (State == SignalState.H)
                    return "0";
            }
            else
            {
                if (State == SignalState.L)
                    return "0";
                if (State == SignalState.H)
                    return "1";
            }
            if (State == SignalState.Z)
                return "Z";

            return "U";
        }
        /// <summary>
        /// Generate a value string for the passed signal or signal group at the requested time. The string will be formatted according to the signal's Radicx field.
        /// </summary>
        /// <param name="Signal">Reference to the signal object to be queried.</param>
        /// <param name="Time">Time value to check the state of the signal.</param>
        /// <param name="ShowPrefix">True to insert a leading prefix like "0x" or "0b".</param>
        /// <returns>String representing the value of the signal or signal group.</returns>
        private string GetValueStr(DisplaySignal Signal, double Time, bool ShowPrefix)
        {
            if (Signal.DisplayPins.Length > 1)
            {
                string s = "";
                if (Signal.Reverse)
                    for (int j = 0; j < Signal.DisplayPins.Length; j++)
                        s += GetValueStr(Signal.DisplayPins[j].Pin.History.FindState(Time), Signal.Invert);
                else
                    for (int j = 0; j < Signal.DisplayPins.Length; j++)
                        s = s.Insert(0, GetValueStr(Signal.DisplayPins[j].Pin.History.FindState(Time), Signal.Invert));

                if (Signal.Radix == RadixType.Binary)
                {
                    if (ShowPrefix)
                        s = "0b" + s;
                }
                else
                {
                    uint value = 0;
                    try
                    {
                        value = Convert.ToUInt32(s, 2);
                        if (Signal.CustomConversion)
                            s = Signal.CustomConvert(value);
                        else if (Signal.Radix == RadixType.Decimal)
                            s = value.ToString();
                        else if (Signal.Radix == RadixType.SignedDec)
                        {
                            if (s[0] == '1')
                            {
                                while (s.Length < 32)
                                    s = s.Insert(0, "1");
                                int v = Convert.ToInt32(s, 2);
                                s = v.ToString();
                            }
                            else s = value.ToString();
                        }
                        else if (Signal.Radix == RadixType.Hexadecimal)
                        {
                            int n = (Signal.DisplayPins.Length + 3) / 4;
                            if (ShowPrefix)
                                s = "0x" + value.ToString("X0" + n.ToString());
                            else
                                s = value.ToString("X0" + n.ToString());
                        }
                    }
                    catch
                    {
                        if (s.IndexOf("U") >= 0)
                            s = "U";
                        else if (s.IndexOf("Z") >= 0)
                            s = "Z";

                        if (Signal.Radix == RadixType.Hexadecimal)
                        {
                            int n = (Signal.DisplayPins.Length + 3) / 4;
                            while (s.Length < n) s += s[0];
                            if (ShowPrefix)
                                s = "0x" + s;
                        }
                    }
                }
                return s;
            }
            else
                return GetValueStr(Signal.DisplayPins[0].Pin.History.FindState(Time), Signal.Invert);
        }

        /// <summary>
        /// Draw all signal value strings to the bmValues bitmap.
        /// </summary>
        /// <param name="bmValues">Reference to the Bitmap to draw to.</param>
        /// <param name="pbValues">Reference to the PictureBox object where bmValues is assigned.</param>
        /// <param name="Time">Time value to check the state of the signals.</param>
        /// <returns>Used width</returns>
        private int DisplaySignalValues(ref Bitmap bmValues, PictureBox pbValues, double Time)
        {
            int usedWidth = 0;
            int h = GetBitmapHeight(ExpandAll);
            if ((bmValues == null) || (h != bmValues.Height))
            {
                bmValues = new Bitmap(pbSignalValues.ClientSize.Width, h);
                if (pbValues != null)
                    pbValues.Image = bmValues;
            }
            //Graphics.FromImage(bmValues).Clear(colorBackgr[drawIdx]);

            int y = TEXT_TOP;
            Graphics grfx = Graphics.FromImage(bmValues);
            grfx.Clear(colorBackgr[drawIdx]);
            for (int i = 0; i < CurrentSignals.Count; i++)
            {
                y = DisplaySignalValue(bmValues, grfx, Time, i, ref usedWidth);
            }

            if (pbValues != null)
                pbValues.Refresh();

            return usedWidth;
        }

        /// <summary>
        /// Draw a signal value string of the indexed signal of the requested time to the graphics object.
        /// </summary>
        /// <param name="Time">Time value of the signal state to check</param>
        /// <param name="grfx">Reference to the graphics object to draw to.</param>
        /// <param name="i">Index of the signal in the CurrentSignal list.</param>
        /// <returns>Return the y-coordinate for the next signal to be drawn.</returns>
        private int DisplaySignalValue(Bitmap bmValues, Graphics grfx, double Time, int i, ref int UsedWidth)
        {
            return DisplaySignalValue(bmValues, grfx, Time, i, ref UsedWidth, false);
        }

        /// <summary>
        /// Draw a signal value string of the indexed signal of the requested time to the bmValues bitmap.
        /// </summary>
        /// <param name="bmValues">Reference to the Bitmap to draw to.</param>
        /// <param name="pbValues">Reference to the PictureBox object where bmNames is assigned.</param>
        /// <param name="Time">Time value of the signal state to check</param>
        /// <param name="i">Index of the signal in the CurrentSignal list.</param>
        /// <returns>Return the y-coordinate for the next signal to be drawn.</returns>
        private int DisplaySignalValue(Bitmap bmValues, PictureBox pbValues, double Time, int i, ref int UsedWidth)
        {
            int y = DisplaySignalValue(bmValues, Graphics.FromImage(bmValues), Time, i, ref UsedWidth, true);
            if (pbValues != null)
                pbValues.Invalidate();
            return y;
        }

        /// <summary>
        /// Draw a signal value string of the indexed signal of the requested time to the graphics object.
        /// </summary>
        /// <param name="Time">Time value of the signal state to check</param>
        /// <param name="grfx">Reference to the graphics object to draw to.</param>
        /// <param name="i">Index of the signal in the CurrentSignal list.</param>
        /// <param name="Clear">If true, the background area for this signal will be cleared before drawing.</param>
        /// <returns>Return the y-coordinate for the next signal to be drawn.</returns>
        private int DisplaySignalValue(Bitmap bmValues, Graphics grfx, double Time, int i, ref int UsedWidth, bool Clear)
        {
            int y = CurrentSignals[i].TextRect.Y;
            string s = GetValueStr(CurrentSignals[i], Time, true);
            SizeF size = grfx.MeasureString(s, ValueFont);
            UsedWidth = Math.Max(UsedWidth, MARGIN_LEFT+(int)size.Width+ MARGIN_RIGHT);

            if (CurrentSignals[i].SelOrHigh == true)
            {
                grfx.FillRectangle(brushBackgrSel[drawIdx], 0, CurrentSignals[i].TextRect.Y, bmValues.Width - 1, CurrentSignals[i].TextRect.Height);
                grfx.DrawString(s, ValueFont, brushTextSel[drawIdx], MARGIN_LEFT, y);
            }
            else
            {
                if (Clear)
                    grfx.FillRectangle(brushBackgr[drawIdx], 0, CurrentSignals[i].TextRect.Y, bmValues.Width - 1, CurrentSignals[i].TextRect.Height);

                grfx.DrawString(s, ValueFont, brushText[drawIdx], MARGIN_LEFT, y);
            }

            y += VERTICAL_STEP;

            if ((CurrentSignals[i].DisplayPins.Length > 1) && ((ExpandAll == true) || (CurrentSignals[i].Expanded == true)))
            {
                for (int j = 0; j < CurrentSignals[i].DisplayPins.Length; j++)
                {
                    string ss = GetValueStr(CurrentSignals[i].DisplayPins[j].Pin.History.FindState(Time), CurrentSignals[i].Invert);
                    SizeF sizeF = grfx.MeasureString(s, ValueFont);
                    UsedWidth = Math.Max(UsedWidth, MARGIN_LEFT + (int)sizeF.Width + MARGIN_RIGHT);
                    if (CurrentSignals[i].DisplayPins[j].SelOrHigh == true)
                    {
                        grfx.FillRectangle(brushBackgrSel[drawIdx], 0, CurrentSignals[i].DisplayPins[j].TextRect.Y, bmValues.Width - 1, CurrentSignals[i].TextRect.Height);
                        grfx.DrawString(ss, ValueFont, brushTextSel[drawIdx], VALUE_INDENT_LEFT, y);
                    }
                    else
                    {
                        if (Clear)
                            grfx.FillRectangle(brushBackgr[drawIdx], 0, CurrentSignals[i].DisplayPins[j].TextRect.Y, bmValues.Width - 1, CurrentSignals[i].TextRect.Height);

                        grfx.DrawString(ss, ValueFont, brushText[drawIdx], VALUE_INDENT_LEFT, y);
                    }

                    y += VERTICAL_STEP;
                }
            }
            return y;
        }
        #endregion Display Signal Values

        #region Signal Value Handlers
        /// <summary>
        /// MouseDown event handler for the signal value picture box.
        /// This handler will bring up a menu for selecting the radix for the signal at the current y-coordinate.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void pbSignalValues_MouseDown(object sender, MouseEventArgs e)
        {
            SetAllSignalSelects(false);
            SetSelectedSignal(e.Y, true);
            if ((e.Button == MouseButtons.Right) && (LastSelectedSignal != null) && (LastSelectedSignal is DisplaySignal))
            {
                switch (((DisplaySignal)LastSelectedSignal).Radix)
                {
                    case RadixType.Binary:
                        tsmiBinary.Checked = true;
                        tsmiDecimal.Checked = false;
                        tsmiSignedDec.Checked = false;
                        tsmiHexadecimal.Checked = false;
                        break;
                    case RadixType.Decimal:
                        tsmiBinary.Checked = false;
                        tsmiDecimal.Checked = true;
                        tsmiSignedDec.Checked = false;
                        tsmiHexadecimal.Checked = false;
                        break;
                    case RadixType.SignedDec:
                        tsmiBinary.Checked = false;
                        tsmiDecimal.Checked = false;
                        tsmiSignedDec.Checked = true;
                        tsmiHexadecimal.Checked = false;
                        break;
                    case RadixType.Hexadecimal:
                        tsmiBinary.Checked = false;
                        tsmiDecimal.Checked = false;
                        tsmiSignedDec.Checked = false;
                        tsmiHexadecimal.Checked = true;
                        break;
                }
                tsmiInvert.Checked = ((DisplaySignal)LastSelectedSignal).Invert;
                tsmiReverse.Checked = ((DisplaySignal)LastSelectedSignal).Reverse;
                tsmiHighlight.Checked = ((DisplaySignal)LastSelectedSignal).Highlight;
                cmsFormat.Show((Control)sender, e.Location);
                return;
            }
        }

        /// <summary>
        /// Paint event handler for the signal value picture box.
        /// This handler draws a horizontal line to possible indicate the selection.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void pbSignalValues_Paint(object sender, PaintEventArgs e)
        {
            if ((MouseX >= 0) && (MouseY >= 0))
            {
                Graphics grfx = e.Graphics;
                Pen pen = new Pen(Color.FromArgb(63, 255, 255, 255), 1);
                grfx.DrawLine(pen, 0, MouseY, pbSignalValues.ClientSize.Width - 1, MouseY);
            }
        }

        #endregion Signal Value Handlers

        #region Display Signal Graph
        /// <summary>
        /// Convert the signal state at the current Y base line into level between low and high depending on the signal.
        /// </summary>
        /// <param name="Y">Y-coordinate of the signal base line for the graph drawing.</param>
        /// <param name="State">Current signal state.</param>
        /// <returns>Y-coordinate for drawing the signal level.</returns>
        private float State2Y(float Y, SignalState State)
        {
            if (State == SignalState.H)
                return Y - SIGNAL_HEIGHT;
            else if (State == SignalState.L)
                return Y;
            else
                return Y - SIGNAL_HEIGHT / 2;
        }

        /// <summary>
        /// Draw a part of the signal graph for one signal to the graphics object.
        /// </summary>
        /// <param name="x">X-coordinate for drawing.</param>
        /// <param name="y">Y-coordinate of the signal base line.</param>
        /// <param name="p0">Last drawing point coordinates to draw a line from. It will be updated to the new point.</param>
        /// <param name="sigy">Signal y-coordinate base line.</param>
        /// <param name="time">Time value to check the signal state for.</param>
        /// <param name="grfx">Reference to the graphics object to draw to.</param>
        /// <param name="Signal">Signal object to check.</param>
        /// <param name="PinIdx">Pin index of the signal.</param>
        private void DrawPartialSignal(ref float x, float y, ref PointF p0, float sigy, double time, Graphics grfx, DisplaySignal Signal, int PinIdx)
        {
            x = Time2X(time);

            PointF p1 = new PointF(x, p0.Y);
            PointF p2 = new PointF(x, sigy);
            string s=GetValueStr(Signal.DisplayPins[PinIdx].Pin.History.FindState(time-0.001), Signal.Invert);
            if (s.Contains("U"))
            {
                if ((p0.Y != y) && (x > p0.X + 1))
                    grfx.FillRectangle((Signal.SelOrHigh ? brushSignalUsel[drawIdx] : brushSignalUstd[drawIdx]), p0.X + 1, p0.Y, x - p0.X, y - p0.Y);

                grfx.DrawLine((Signal.SelOrHigh ? penSignalUsel[drawIdx] : penSignalUstd[drawIdx]), p0, p1);
                grfx.DrawLine((Signal.SelOrHigh ? penSignalHLsel[drawIdx] : penSignalHLstd[drawIdx]), p1, p2);
            }
            else if (s.Contains("Z"))
            {
                if ((p0.Y != y) && (x > p0.X + 1))
                    grfx.FillRectangle((Signal.SelOrHigh ? brushSignalZsel[drawIdx] : brushSignalZstd[drawIdx]), p0.X + 1, p0.Y, x - p0.X, y - p0.Y);

                grfx.DrawLine((Signal.SelOrHigh ? penSignalZsel[drawIdx] : penSignalZstd[drawIdx]), p0, p1);
                grfx.DrawLine((Signal.SelOrHigh ? penSignalHLsel[drawIdx] : penSignalHLstd[drawIdx]), p1, p2);
            }
            else
            {
                if ((p0.Y != y) && (x > p0.X + 1))
                    grfx.FillRectangle((Signal.SelOrHigh ? brushSignalHLsel[drawIdx] : brushSignalHLstd[drawIdx]), p0.X + 1, p0.Y, x - p0.X, y - p0.Y);
                grfx.DrawLines((Signal.SelOrHigh ? penSignalHLsel[drawIdx] : penSignalHLstd[drawIdx]), new PointF[] { p0, p1, p2 });
            }

            p0 = p2;
        }

        /// <summary>
        /// Draw a part of the signal graph for one signal to the graphics object.
        /// </summary>
        /// <param name="x">X-coordinate for drawing.</param>
        /// <param name="y">Y-coordinate of the signal base line.</param>
        /// <param name="time">Time value to check the signal state for.</param>
        /// <param name="grfx">Reference to the graphics object to draw to.</param>
        /// <param name="Signal">Signal object to check.</param>
        private void DrawPartialBus(ref float x, float y, double time, Graphics grfx, DisplaySignal Signal)
        {
            float xx = Time2X(time);

            if (xx > x + BUS_MIN_DX)
            {
                string s = GetValueStr(Signal, time - 1, false);
                string ss = Signal.CustomConversion ? "" : s;

                PointF[] poly = new PointF[7];
                poly[0] = new PointF(x, y - SIGNAL_HEIGHT / 2);
                poly[1] = new PointF(x + BUS_MIN_DX, y - SIGNAL_HEIGHT);
                poly[2] = new PointF(xx - BUS_MIN_DX, y - SIGNAL_HEIGHT);
                poly[3] = new PointF(xx, y - SIGNAL_HEIGHT / 2);
                poly[4] = new PointF(xx - BUS_MIN_DX, y);
                poly[5] = new PointF(x + BUS_MIN_DX, y);
                poly[6] = poly[0];

                if (ss.Contains("U"))
                    grfx.DrawPolygon((Signal.SelOrHigh ? penSignalUsel[drawIdx] : penSignalUstd[drawIdx]), poly);
                else if (ss.Contains("Z"))
                    grfx.DrawPolygon((Signal.SelOrHigh ? penSignalZsel[drawIdx] : penSignalZstd[drawIdx]), poly);
                else
                {
                    if (Signal.SelOrHigh)
                        grfx.FillPolygon(brushSignalHLsel[drawIdx], poly);

                    //grfx.FillPolygon((Signal.SelOrHigh ? brushSignalHLsel : brushSignalHLstd), poly);
                    grfx.DrawPolygon((Signal.SelOrHigh ? penSignalHLsel[drawIdx] : penSignalHLstd[drawIdx]), poly);
                }

                float dx = xx - x;
                if (dx > 20)
                {
                    float xm = x + dx / 2;
                    SizeF size = grfx.MeasureString(s + "X", SignalFont);
                    if (dx > size.Width)
                    {
                        grfx.DrawString(s, Signal.SelOrHigh ? SignalFontHL : SignalFont, brushGraphText[drawIdx], xm, y - SIGNAL_HEIGHT + (Signal.SelOrHigh?0.45f:1), StringFormatCenter);
                    }
                }

                x = xx;
            }
            else
            {
                grfx.FillRectangle((Signal.SelOrHigh ? brushSignalHLsel[drawIdx] : brushSignalHLstd[drawIdx]), x, y - SIGNAL_HEIGHT, BUS_MIN_DX, SIGNAL_HEIGHT);
            }
        }

        /// <summary>
        /// Display all signal graphs by drawing to the bmGraphs bitmap.
        /// <param name="bmGraphs">Reference to the Bitmap to draw to.</param>
        /// <param name="pbGraphs">Reference to the PictureBox object where bmGraphs is assigned.</param>
        /// </summary>
        private void DisplaySignalGraphs(ref Bitmap bmGraphs, PictureBox pbGraphs)
        {
            SuspendLayout();
            int w = GetBitmapWidth();
            int h = GetBitmapHeight(ExpandAll);
            if ((bmGraphs == null) || (bmGraphs.Width != w) || (bmGraphs.Height != h))
            {
                bmGraphs = new Bitmap(w, h);
                if (pbGraphs != null) 
                    pbGraphs.Image = bmGraphs;
            }

            float x = MARGIN_LEFT;
            float y = MARGIN_TOP + VERTICAL_STEP;
            Graphics grfx = Graphics.FromImage(bmGraphs);
            grfx.Clear(colorBackgr[drawIdx]);
            for (int i = 0; i < CurrentSignals.Count; i++)
            {
                CurrentSignals[i].SignalY = y;
                y = DisplaySignalGraph(bmGraphs, grfx, i);
            }
            ResumeLayout();
            if (pbGraphs != null)
                pbGraphs.Refresh();
        }

        /// <summary>
        /// Draw one signal or signal group addressed via the index into the CurrentSignals list to the graphics object.
        /// </summary>
        /// <param name="bmGraphs">Reference to the Bitmap to draw to.</param>
        /// <param name="grfx">Reference to the graphics object to draw the signal graph to.</param>
        /// <param name="i">Index of the signal or signal group in the CurrentSignals list.</param>
        /// <returns>Y-coordinate of the base line of the next signal.</returns>
        private float DisplaySignalGraph(Bitmap bmGraphs, Graphics grfx, int i)
        {
            return DisplaySignalGraph(bmGraphs, grfx, i, false);
        }

        /// <summary>
        /// Draw one signal or signal group addressed via the index into the CurrentSignals list to the bmGraphs bitmap.
        /// </summary>
        /// <param name="bmGraphs">Reference to the Bitmap to draw to.</param>
        /// <param name="pbGraphs">Reference to the PictureBox object where bmGraphs is assigned.</param>
        /// <param name="i">Index of the signal or signal group in the CurrentSignals list.</param>
        /// <returns>Y-coordinate of the base line of the next signal.</returns>
        private float DisplaySignalGraph(Bitmap bmGraphs, PictureBox pbGraphs, int i)
        {
            float y = DisplaySignalGraph(bmGraphs, Graphics.FromImage(bmGraphs), i, true);
            if (pbGraphs != null)
                pbGraphs.Invalidate();
            return y;
        }

        /// <summary>
        /// Draw one signal or signal group addressed via the index into the CurrentSignals list to the graphics object.
        /// </summary>
        /// <param name="bmGraphs">Reference to the Bitmap to draw to.</param>
        /// <param name="grfx">Reference to the graphics object to draw the signal graph to.</param>
        /// <param name="i">Index of the signal or signal group in the CurrentSignals list.</param>
        /// <param name="Clear">If true, the background area will be cleared before drawing.</param>
        /// <returns>Y-coordinate of the base line of the next signal.</returns>
        private float DisplaySignalGraph(Bitmap bmGraphs, Graphics grfx, int i, bool Clear)
        {
            float y = CurrentSignals[i].SignalY;
            float x = MARGIN_LEFT;
            if (Clear)
                grfx.FillRectangle(brushBackgr[drawIdx], 0, y - SIGNAL_HEIGHT-1, bmGraphs.Width - 1, SIGNAL_HEIGHT+2);
            
            float sigy = y;
            PointF p0 = new PointF(x, y);
            if (CurrentSignals[i].DisplayPins.Length == 1)
            {
                CurrentSignals[i].DisplayPins[0].SignalY = sigy;

                int minIdx = CurrentSignals[i].DisplayPins[0].Pin.History.FindIndex(DisplayMinTime);
                int maxIdx = CurrentSignals[i].DisplayPins[0].Pin.History.FindIndex(DisplayMaxTime);

                for (int n = minIdx; n <= maxIdx; n++)
                {
                    double time = CurrentSignals[i].DisplayPins[0].Pin.History[n].Time;
                    sigy = State2Y(y, CurrentSignals[i].DisplayPins[0].Pin.History[n].State);
                    DrawPartialSignal(ref x, y, ref p0, sigy, time, grfx, CurrentSignals[i], 0);
                }

                DrawPartialSignal(ref x, y, ref p0, sigy, DisplayMaxTime, grfx, CurrentSignals[i], 0);
                y += VERTICAL_STEP;
            }
            else
            {
                int[] idx = new int[CurrentSignals[i].DisplayPins.Length];
                for (int j = 0; j < CurrentSignals[i].DisplayPins.Length; j++)
                    idx[j] = CurrentSignals[i].DisplayPins[j].Pin.History.FindIndex(DisplayMinTime);

                double time = DisplayMinTime;

                do
                {
                    for (int j = 0; j < CurrentSignals[i].DisplayPins.Length; j++)
                        if ((idx[j] < CurrentSignals[i].DisplayPins[j].Pin.History.Count) && (CurrentSignals[i].DisplayPins[j].Pin.History[idx[j]].Time <= time))
                            idx[j]++;

                    time = DisplayMaxTime;
                    for (int j = 0; j < CurrentSignals[i].DisplayPins.Length; j++)
                        if (idx[j] < CurrentSignals[i].DisplayPins[j].Pin.History.Count)
                            time = Math.Min(CurrentSignals[i].DisplayPins[j].Pin.History[idx[j]].Time, time);

                    DrawPartialBus(ref x, y, time, grfx, CurrentSignals[i]);

                } while (time < DisplayMaxTime);

                y += VERTICAL_STEP;

                if ((ExpandAll == true) || (CurrentSignals[i].Expanded == true))
                {
                    for (int j = 0; j < CurrentSignals[i].DisplayPins.Length; j++)
                    {
                        x = MARGIN_LEFT;
                        sigy = y;
                        p0 = new PointF(x, y);
                        CurrentSignals[i].DisplayPins[j].SignalY = sigy;

                        if (Clear)
                            grfx.FillRectangle(brushBackgr[drawIdx], 0, y, bmGraphs.Width - 1, -VERTICAL_STEP);

                        int minIdx = CurrentSignals[i].DisplayPins[j].Pin.History.FindIndex(DisplayMinTime);
                        int maxIdx = CurrentSignals[i].DisplayPins[j].Pin.History.FindIndex(DisplayMaxTime);

                        for (int n = minIdx; n <= maxIdx; n++)
                        {
                            time = CurrentSignals[i].DisplayPins[j].Pin.History[n].Time;
                            sigy = State2Y(y, CurrentSignals[i].DisplayPins[j].Pin.History[n].State);
                            DrawPartialSignal(ref x, y, ref p0, sigy, time, grfx, CurrentSignals[i], j);
                        }

                        DrawPartialSignal(ref x, y, ref p0, sigy, DisplayMaxTime, grfx, CurrentSignals[i], j);
                        y += VERTICAL_STEP;
                    }
                }
            }
            return y;
        }
        #endregion Display Signal Graph

        #region Signal Graph Event Handlers
        /// <summary>
        /// MouseMove event handler for the signal graph picture box.
        /// This handler initiates drawing markers on top of the signal graph picture box.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void pbSignalGraphs_MouseMove(object sender, MouseEventArgs e)
        {
            int X = e.X & 0xFFFF;
            int Y = e.Y & 0xFFFF;

            MouseX = X;
            if (sender == pbSignalGraphs)
                MouseY = Y;
            else
                MouseY = -1;

            DataTime = X2Time(MouseX);
            DataTime = Math.Min(Math.Max(DataTime, 0), SimulationMaxTime);

            Marker marker = FindMovingMarker();
            if (marker != null)
            {
                marker.X = MouseX;
                marker.Y = MouseY;
                marker.Time = DataTime;
                pbSignalGraphs.Refresh();
                pbSignalGraphRuler.Refresh();
                if (DataTime != LastDataTime)
                {
                    DisplaySignalValues(ref bmSignalValues, pbSignalValues, DataTime);
                    LastDataTime = DataTime;
                }
                pbSignalValues.Refresh();
            }
            else if (FindCloseMarker(MouseX) != null)
            {
                if (sender is PictureBox)
                    ((PictureBox)sender).Cursor = Cursors.VSplit;
            }
            else
            {
                if (sender is PictureBox)
                    ((PictureBox)sender).Cursor = Cursors.Default;
            }

            if (CursorMarker.X < 0)
            {
                pbSignalGraphs.Refresh();
                pbSignalGraphRuler.Refresh();
                if (DataTime != LastDataTime)
                {
                    DisplaySignalValues(ref bmSignalValues, pbSignalValues, DataTime);
                    LastDataTime = DataTime;
                }
                pbSignalNames.Refresh();
                pbSignalValues.Refresh();
            }

            lbMouseCoord.Text = "MouseX=" + MouseX.ToString() + " MouseY=" + MouseY.ToString() + " DataTime=" + DataTime.ToString("F0") + " LocX=" + pbSignalGraphs.Location.X.ToString()+"  X2Time="+X2Time(MouseX).ToString("F0") +"  Time2X="+Time2X(DataTime).ToString("F0") +"   ZoomX="+SignalsZoomX.ToString("F3");
            if (CursorMarker != null)
                lbMouseCoord.Text += " CursorMarker.X=" + CursorMarker.X.ToString();
            lbMouseCoord.Refresh();
        }

        /// <summary>
        /// MouseLeave event handler for the signal graph picture box.
        /// This handler finalizes any selection or move.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void pbSignalGraphs_MouseLeave(object sender, EventArgs e)
        {
            MouseX = -1;
            MouseY = -1;        
            DataTime = 0;
            LastDataTime = -1;
            pbSignalGraphs.Refresh();
            pbSignalGraphRuler.Refresh();
            pbSignalNames.Refresh();
            if (CursorMarker.X >= 0)
                DisplaySignalValues(ref bmSignalValues, pbSignalValues, CursorMarker.Time);
            else
                pbSignalValues.Refresh();

            ClearMarkerMoving();
        }

        /// <summary>
        /// MouseDown event handler for the signal graph picture box.
        /// This handler captures the current mouse coordinates and tries to find any signal for selection.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void pbSignalGraphs_MouseDown(object sender, MouseEventArgs e)
        {
            int X = e.X & 0xFFFF;
            int Y = e.Y & 0xFFFF;

            if (e.Button == MouseButtons.Left)
            {
                SetAllSignalSelects(false);

                Marker marker = FindCloseMarker(X);
                if (marker != null)
                {
                    if (marker.Selected)
                        marker.Selected = false;
                    else
                    {
                        if (marker == CursorMarker)
                            SetSelectedSignal(Y, true);
                        else
                            ClearMarkerSelected();  
                        marker.Moving = true;
                        marker.Selected = true;
                    }
                }
                else
                {
                    CursorMarker.X = X;
                    CursorMarker.Y = Y;
                    CursorMarker.Moving = true;
                    CursorMarker.Selected = true;
                    CursorMarker.Time = X2Time(X);
                    DisplaySignalValues(ref bmSignalValues, pbSignalValues, CursorMarker.Time);
                    SetSelectedSignal(Y, true);
                }
            }
            else if (e.Button == MouseButtons.Right)
            {
                //CursorMarker.X = -1;
                //CursorMarker.Time = -1;
                //tsbGotoCursor.Enabled = false;
                //SetSelectedSignal(Y, false);

                pbSignalValues_MouseDown(sender, e);
            }

            MouseX = X;
            MouseY = Y;
            pbSignalGraphs.Refresh();
            pbSignalGraphRuler.Refresh();
        }

        /// <summary>
        /// MouseUp event handler for the signal graph picture box.
        /// This handler finishes up any previous marker move.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void pbSignalGraphs_MouseUp(object sender, MouseEventArgs e)
        {
            ClearMarkerMoving();
            CursorMarker.Selected = false;
            pbSignalGraphRuler.Refresh();
            pbSignalGraphs.Refresh();
        }

        /// <summary>
        /// Draw all markers to the graphics object.
        /// </summary>
        /// <param name="grfx">Graphics object to draw to</param>
        private void DrawSignalGraphMarkers(Graphics grfx)
        {
            if (Markers.Count > 0)
            {
                for (int i = 0; i < Markers.Count; i++)
                {
                    Pen pen = Markers[i].Selected == true ? penMarkerSel[drawIdx] : penMarker[drawIdx];
                    grfx.DrawLine(pen, Markers[i].X, 0, Markers[i].X, pbSignalGraphs.ClientSize.Height - 1);
                }
            }

            if (CursorMarker.X >= 0)
            {
                Pen pen = CursorMarker.Selected == true ? penCursorSel[drawIdx] : penCursor[drawIdx];
                grfx.DrawLine(pen, CursorMarker.X, 0, CursorMarker.X, pbSignalGraphs.ClientSize.Height - 1);
            }
            else if (MouseX >= 0)
            {
                Pen pen = new Pen(Color.FromArgb(63, 255, 255, 255), 1);
                grfx.DrawLine(pen, MouseX, 0, MouseX, pbSignalGraphs.ClientSize.Height - 1);
                grfx.DrawLine(pen, 0, MouseY, pbSignalGraphs.ClientSize.Width - 1, MouseY);
            }

            if (TriggerMarker.X >= 0)
            {
                grfx.DrawLine(penTrigger[drawIdx], TriggerMarker.X, 0, TriggerMarker.X, pbSignalGraphs.ClientSize.Height - 1);
            }
        }

        /// <summary>
        /// Paint event handler for the signal graph picture box.
        /// This handler draws markers on top of the signal graph picture box.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void pbSignalGraphs_Paint(object sender, PaintEventArgs e)
        {
            DrawSignalGraphMarkers(e.Graphics);
        }

        /// <summary>
        /// MouseWheel event handler for the signal graph picture box.
        /// This handler scrolls the drawing areas up and down depending on the wheel movements.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void SignalNames_MouseWheelEventHandler(object sender, MouseEventArgs e)
        {
            //int y = Math.Max(Math.Min(pbSignalGraphs.Location.Y + e.Delta, 0),-(pbSignalNames.Height-pnSignalNames.Height));
            //pbSignalGraphs.Location = new Point(pbSignalGraphs.Location.X, y);
            try
            {
                pnSignalGraphs.VerticalScroll.Value -= e.Delta;
            }
            catch { }
        }

        /// <summary>
        /// LocationChanged event handler for the signal graph picture box.
        /// A change in the vertical location of the pbSignalGraphs picture box will be passed on to the signal names and values to keep them in sync.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void pbSignalGraphs_LocationChanged(object sender, EventArgs e)
        {
            pbSignalNames.Location = new Point(0, pbSignalGraphs.Location.Y);
            pbSignalValues.Location = new Point(0, pbSignalGraphs.Location.Y);
            pbSignalGraphRuler.Location = new Point(pbSignalGraphs.Location.X, 0);
            label1.Text = pbSignalGraphs.Location.ToString() + "  " + pbSignalGraphRuler.Location.ToString();
        }

        #endregion Signal Graph Event Handlers

        #region Display Signal Graph Ruler
        /// <summary>
        /// Displays a basic ruler on the bmGraphRuler bitmap.
        /// <param name="bmGraphRuler">Reference to the Bitmap to draw to.</param>
        /// <param name="pbGraphRuler">Reference to the PictureBox object where bmGraphRuler is assigned.</param>
        /// </summary>
        private void DisplaySignalGraphRuler(ref Bitmap bmGraphRuler, PictureBox pbGraphRuler)
        {
            int w = GetBitmapWidth();
            if ((bmGraphRuler == null) || (bmGraphRuler.Width != w))
            {
                bmGraphRuler = new Bitmap(w, pbSignalGraphRuler.ClientSize.Height);
                if (pbGraphRuler != null)
                    pbGraphRuler.Image = bmGraphRuler;
            }
            Graphics grfx = Graphics.FromImage(bmGraphRuler);
            grfx.Clear(colorBackgr[drawIdx]);

            int y = bmGraphRuler.Height - 1;
            grfx.DrawLine(new Pen(Color.White, 3), 0, y, bmGraphRuler.Width - 1, y);

            if (pbGraphRuler != null)
                pbGraphRuler.Invalidate();
        }
        #endregion Display Signal Graph Ruler

        #region Signal Graph Ruler Handlers


        /// <summary>
        /// Draw all markers to the graphics object.
        /// </summary>
        /// <param name="grfx">Graphics object to draw to</param>
        private void DrawSignalGraphRulerMarkers(Graphics grfx)
        {
            if (Markers.Count > 0)
            {
                for (int i = 0; i < Markers.Count; i++)
                {
                    Pen penLine = Markers[i].Selected == true ? penMarkerSel[drawIdx] : penMarker[drawIdx];
                    Brush brFill = Markers[i].Selected == true ? brushMarkerFillSel[drawIdx] : brushMarkerFill[drawIdx];
                    Brush brText = Markers[i].Selected == true ? brushMarkerTextSel[drawIdx] : brushMarkerText[drawIdx];

                    grfx.DrawLine(penLine, Markers[i].X, 17, Markers[i].X, pbSignalGraphRuler.ClientSize.Height - 1);
                    Point p0 = new Point(Markers[i].X, 17 - pbSignalGraphRuler.Location.Y);
                    string s = Time2Str(Markers[i].Time);
                    SizeF size = grfx.MeasureString(s, SignalFont);
                    grfx.FillRectangle(brFill, p0.X, p0.Y, size.Width, size.Height);
                    grfx.DrawRectangle(penMarkerRect[drawIdx], p0.X, p0.Y, size.Width, size.Height);
                    grfx.DrawString(s, SignalFont, brText, p0, StringFormatNear);
                }
            }

            if (CursorMarker.X >= 0)
            {
                Pen penLine = CursorMarker.Selected == true ? penCursorSel[drawIdx] : penCursor[drawIdx];
                Brush brFill = CursorMarker.Selected == true ? brushCursorFillSel[drawIdx] : brushCursorFill[drawIdx];
                Brush brText = CursorMarker.Selected == true ? brushCursorTextSel[drawIdx] : brushCursorText[drawIdx];

                grfx.DrawLine(penLine, CursorMarker.X, 2, CursorMarker.X, pbSignalGraphRuler.ClientSize.Height - 1);
                Point p0 = new Point(CursorMarker.X, 2);
                string s = Time2Str(CursorMarker.Time);
                SizeF size = grfx.MeasureString(s, SignalFont);
                grfx.FillRectangle(brFill, p0.X, p0.Y, size.Width, size.Height);
                grfx.DrawRectangle(penMarkerRect[drawIdx], p0.X, p0.Y, size.Width, size.Height);
                grfx.DrawString(s, SignalFont, brText, p0, StringFormatNear);
            }
            else if (MouseX >= 0) 
            {
                Pen pen = new Pen(Color.FromArgb(63, 255, 255, 255), 1);
                grfx.DrawLine(pen, MouseX, 0, MouseX, pbSignalGraphRuler.ClientSize.Height - 1);
                grfx.DrawString(Time2Str(DataTime), SignalFont, Brushes.White, new Point(MouseX, 1 - pbSignalGraphRuler.Location.Y), StringFormatNear);
            }

            if (TriggerMarker.X >= 0)
            {
                grfx.DrawLine(penTrigger[drawIdx], TriggerMarker.X, 32, TriggerMarker.X, pbSignalGraphRuler.ClientSize.Height - 1);
                Point p0 = new Point(TriggerMarker.X, 32 - pbSignalGraphRuler.Location.Y);
                string s = Time2Str(Schematics.TriggerTime);
                SizeF size = grfx.MeasureString(s, SignalFont);
                grfx.FillRectangle(brushTriggerFill[drawIdx], p0.X, p0.Y, size.Width, size.Height);
                grfx.DrawRectangle(penMarkerRect[drawIdx], p0.X, p0.Y, size.Width, size.Height);
                grfx.DrawString(s, SignalFont, brushTriggerText[drawIdx], p0, StringFormatNear);
            }

        }

        /// <summary>
        /// Paint event handler for the signal graph ruler picture box.
        /// This handler draws markers on top of the signal graph ruler picture box.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void pbSignalGraphRuler_Paint(object sender, PaintEventArgs e)
        {
            DrawSignalGraphRulerMarkers(e.Graphics);
        }
        #endregion Signal Graph Ruler Handlers

        #region Signal Value Radix Event Handlers

        /// <summary>
        /// Click event handler for the Binary ToolStripMenuItem.
        /// This handler tries to change the Radix field of the selected signal to Binary.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiBinary_Click(object sender, EventArgs e)
        {
            try { ((DisplaySignal)LastSelectedSignal).Radix = RadixType.Binary; } catch { }
            DisplaySignalValues(ref bmSignalValues, pbSignalValues, CursorMarker.Time);
            if ((LastSelectedSignal != null) && (LastSelectedSignal is DisplaySignal) && ((LastSelectedSignal as DisplaySignal).DisplayPins.Length > 1) && (LastSelectedSignalIdx >= 0))
                DisplaySignalGraph(bmSignalGraphs,pbSignalGraphs, LastSelectedSignalIdx);
        }

        /// <summary>
        /// Click event handler for the Decimal ToolStripMenuItem.
        /// This handler tries to change the Radix field of the selected signal to Decimal.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiDecimal_Click(object sender, EventArgs e)
        {
            try { ((DisplaySignal)LastSelectedSignal).Radix = RadixType.Decimal; } catch { }
            DisplaySignalValues(ref bmSignalValues, pbSignalValues, CursorMarker.Time);
            if ((LastSelectedSignal != null) && (LastSelectedSignal is DisplaySignal) && ((LastSelectedSignal as DisplaySignal).DisplayPins.Length > 1) && (LastSelectedSignalIdx >= 0))
                DisplaySignalGraph(bmSignalGraphs, pbSignalGraphs, LastSelectedSignalIdx);
        }

        /// <summary>
        /// Click event handler for the Decimal ToolStripMenuItem.
        /// This handler tries to change the Radix field of the selected signal to Decimal.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiSignedDec_Click(object sender, EventArgs e)
        {
            try { ((DisplaySignal)LastSelectedSignal).Radix = RadixType.SignedDec; } catch { }
            DisplaySignalValues(ref bmSignalValues, pbSignalValues, CursorMarker.Time);
            if ((LastSelectedSignal != null) && (LastSelectedSignal is DisplaySignal) && ((LastSelectedSignal as DisplaySignal).DisplayPins.Length > 1) && (LastSelectedSignalIdx >= 0))
                DisplaySignalGraph(bmSignalGraphs, pbSignalGraphs, LastSelectedSignalIdx);
        }

        /// <summary>
        /// Click event handler for the Hexadecimal ToolStripMenuItem.
        /// This handler tries to change the Radix field of the selected signal to Hexadecimal.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiHexadecimal_Click(object sender, EventArgs e)
        {
            try { ((DisplaySignal)LastSelectedSignal).Radix = RadixType.Hexadecimal; } catch { }
            DisplaySignalValues(ref bmSignalValues, pbSignalValues, CursorMarker.Time);
            if ((LastSelectedSignal != null) && (LastSelectedSignal is DisplaySignal) && ((LastSelectedSignal as DisplaySignal).DisplayPins.Length > 1) && (LastSelectedSignalIdx >= 0))
                DisplaySignalGraph(bmSignalGraphs, pbSignalGraphs, LastSelectedSignalIdx);
        }


        /// <summary>
        /// Click event handler for the Invert ToolStripMenuItem.
        /// This handler tries to change the bitwise inversion.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiInvert_Click(object sender, EventArgs e)
        {
            try { ((DisplaySignal)LastSelectedSignal).Invert = tsmiInvert.Checked; } catch { }
            DisplaySignalValues(ref bmSignalValues, pbSignalValues, CursorMarker.Time);
            if ((LastSelectedSignal != null) && (LastSelectedSignal is DisplaySignal) && ((LastSelectedSignal as DisplaySignal).DisplayPins.Length > 1) && (LastSelectedSignalIdx >= 0))
                DisplaySignalGraph(bmSignalGraphs, pbSignalGraphs, LastSelectedSignalIdx);
        }

        private void tsmiReverse_Click(object sender, EventArgs e)
        {
            try { ((DisplaySignal)LastSelectedSignal).Reverse = tsmiReverse.Checked; } catch { }
            DisplaySignalValues(ref bmSignalValues, pbSignalValues, CursorMarker.Time);
            if ((LastSelectedSignal != null) && (LastSelectedSignal is DisplaySignal) && ((LastSelectedSignal as DisplaySignal).DisplayPins.Length > 1) && (LastSelectedSignalIdx >= 0))
                DisplaySignalGraph(bmSignalGraphs, pbSignalGraphs, LastSelectedSignalIdx);
        }

        private void tsmiHighlight_Click(object sender, EventArgs e)
        {
            try { ((DisplaySignal)LastSelectedSignal).Highlight = tsmiHighlight.Checked; } catch { }
            DisplaySignalValues(ref bmSignalValues, pbSignalValues, CursorMarker.Time);
        }

        #endregion Signal Value Radix Event Handlers

        #region File Menu Handlers
        /// <summary>
        /// Loads a schematics specified by the parameters, loads the settings file for it and runs the simulation.
        /// </summary>
        /// <param name="Source">Enumeration to identify the source of the schematics.</param>
        /// <param name="Name">Short name to identify this schematics and the XML file to load for it.</param>
        /// <param name="NetlistFileName">Full filename of the KiCad netlist to load from, if netlist import was selected.</param>
        private void LoadSchematics(SchematicsSource Source, string Name, string NetlistFileName)
        {
            CurrentSignals.Clear();
            SelectCodedSchematics(Source, Name, NetlistFileName);
            AppSettings.SchematicsSource = Source;
            AppSettings.SchematicsName = Name;
            AppSettings.NetlistFileName = NetlistFileName;

            if (AppSettings.LoadSchematics())
                LoadAppSettings();
            else
                FillSignalList(CurrentSignals);

            if ((LogView != null) && (tsmiAutoCloseImportForm.Checked))
                LogView.Close();

            RunSimulation();
            pnSignalGraphs.HorizontalScroll.Value = AppSettings.SignalGraphsLocationX;
            pnSignalGraphs.VerticalScroll.Value = AppSettings.SignalGraphsLocationY;
        }

        /// <summary>
        /// Update the recent KiCad file list and moves the filename to the top.
        /// In order to load from XML file correctly afterwards, the new list is copied to ApSettings.
        /// </summary>
        /// <param name="FileName">A full filename of the selected KiCad netlist.</param>
        private void UpdateKiCadFiles(string FileName)
        {
            int idx = RecentKiCadFiles.IndexOf(FileName);
            if (idx >= 0)
                RecentKiCadFiles.RemoveAt(idx);
            RecentKiCadFiles.Insert(0, FileName);
            while (RecentKiCadFiles.Count > 10)
                RecentKiCadFiles.RemoveAt(RecentKiCadFiles.Count - 1);

            AppSettings.RecentKiCadFiles.Clear();
            AppSettings.RecentKiCadFiles.AddRange(RecentKiCadFiles);
        }

        /// <summary>
        /// ToolStripMenuItem click handler for the KiCad Netlist Import menu item.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiKiCadNetlistImport_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            if (ofdKiCadNetlist.ShowDialog() == DialogResult.OK)
            {
                UpdateKiCadFiles(ofdKiCadNetlist.FileName);
                LoadSchematics(SchematicsSource.NetlistImport, Path.GetFileName(ofdKiCadNetlist.FileName).Trim().Replace(' ', '_'), ofdKiCadNetlist.FileName);
            }
            tsmiFile.DropDown.Close();
            SetEnabled(true);
        }

        /// <summary>
        /// ToolStripMenuItem dropdown handler for the KiCad Netlist Import menu item to fill the recent file list.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiKiCadNetlistImport_DropDownOpening(object sender, EventArgs e)
        {
            tsmiKiCadNetlistImport.DropDown.Items.Clear();
            for (int i = 0; i < RecentKiCadFiles.Count; i++)
                tsmiKiCadNetlistImport.DropDown.Items.Add(RecentKiCadFiles[i], null, tsmiKiCadNetlistImportRecent_Click);
        }

        /// <summary>
        /// ToolStripMenuItem click handler for the Recent KiCad Netlist Import menu item.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiKiCadNetlistImportRecent_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            string filename = ((ToolStripMenuItem)sender).Text;
            if (File.Exists(filename))
            {
                UpdateKiCadFiles(filename);
                LoadSchematics(SchematicsSource.NetlistImport, Path.GetFileName(filename).Trim().Replace(' ', '_'), filename);
            }
            else
            {
                MessageBox.Show("Selected File does not exist");
                int idx = RecentKiCadFiles.IndexOf(filename);
                if (idx >= 0)
                    RecentKiCadFiles.RemoveAt(idx);
            }
            tsmiFile.DropDown.Close();
            SetEnabled(true);
        }

        /// <summary>
        /// ToolStripMenuItem click handler for the Ben Eater 8bit menu item.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiBenEater8BitComputer_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            LoadSchematics(SchematicsSource.BenEater8Bit, BenEater8bit.SCHEMATICS_NAME, "");
            tsmiFile.DropDown.Close();
            SetEnabled(true);
        }

        /// <summary>
        /// ToolStripMenuItem click handler for the Gigatron TTL menu item.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiGigatronTTL_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            LoadSchematics(SchematicsSource.GigatronTTL, Gigatron.SCHEMATICS_NAME, "");
            tsmiFile.DropDown.Close();
            SetEnabled(true);
        }

        /// <summary>
        /// ToolStripMenuItem click handler for the Test Schematics menu item.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiTestSchematics_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            LoadSchematics(SchematicsSource.TestSchematics, TestSchematics.SCHEMATICS_NAME, "");
            tsmiFile.DropDown.Close();
            SetEnabled(true);
        }

        /// <summary>
        /// Loads a SimTTL file and all its contents and displays the contents.
        /// </summary>
        /// <param name="FileName">Full filename of the KiCad netlist to load from, if netlist import was selected.</param>
        private void LoadSimTTLFile(string FileName)
        {
            SetEnabled(false);
            CurrentSignals.Clear();
            string name = Path.GetFileName(FileName).Trim().Replace(' ', '_');
            SelectCodedSchematics(SchematicsSource.SimTTLFile, name, FileName);
            AppSettings.SchematicsSource = SchematicsSource.SimTTLFile;
            AppSettings.SchematicsName = name;
            AppSettings.NetlistFileName = "";
            AppSettings.SimTTLFileName = FileName;

            SimTTLFile sttlf = new SimTTLFile(this);
            sttlf.LoadSimTTLFile(FileName);
            LinkCurrentStimuli();
            CountSelectedSignals();
            UpdateDisplays();

            pnSignalGraphs.HorizontalScroll.Value = AppSettings.SignalGraphsLocationX;
            pnSignalGraphs.VerticalScroll.Value = AppSettings.SignalGraphsLocationY;
            SetEnabled(true);
        }

        /// <summary>
        /// Update the recent SimTTL file list and moves the filename to the top.
        /// In order to load from XML file correctly afterwards, the new list is copied to ApSettings.
        /// </summary>
        /// <param name="FileName">A full filename of the selected SimTTL file.</param>
        private void UpdateSimTTLFiles(string FileName)
        {
            int idx = RecentSimTTLFiles.IndexOf(FileName);
            if (idx >= 0)
                RecentSimTTLFiles.RemoveAt(idx);
            RecentSimTTLFiles.Insert(0, FileName);
            while (RecentSimTTLFiles.Count > 10)
                RecentSimTTLFiles.RemoveAt(RecentSimTTLFiles.Count - 1);

            AppSettings.RecentSimTTLFiles.Clear();
            AppSettings.RecentSimTTLFiles.AddRange(RecentSimTTLFiles);
        }

        /// <summary>
        /// ToolStripMenuItem click handler for the Load SimTTL File menu item.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiLoadSimTTLFile_Click(object sender, EventArgs e)
        {
            if (ofdSimTTLFile.ShowDialog() == DialogResult.OK)
            {
                SetEnabled(false);
                UpdateSimTTLFiles(ofdSimTTLFile.FileName);
                LoadSimTTLFile(ofdSimTTLFile.FileName);
                SetEnabled(true);
            }
            tsmiFile.DropDown.Close();
        }

        /// <summary>
        /// ToolStripMenuItem dropdown handler for the Load SimTTL File menu item to fill the recent file list.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiLoadSimTTLFile_DropDownOpening(object sender, EventArgs e)
        {
            tsmiLoadSimTTLFile.DropDown.Items.Clear();
            for (int i = 0; i < RecentSimTTLFiles.Count; i++)
                tsmiLoadSimTTLFile.DropDown.Items.Add(RecentSimTTLFiles[i], null, tsmiLoadSimTTLFileRecent_Click);
        }

        /// <summary>
        /// ToolStripMenuItem click handler for the Recent SimTTL File menu item.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiLoadSimTTLFileRecent_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            string filename = ((ToolStripMenuItem)sender).Text;
            if (File.Exists(filename))
            {
                UpdateSimTTLFiles(filename);
                LoadSimTTLFile(filename);
            }
            else
            {
                MessageBox.Show("Selected File does not exist");
                int idx = RecentSimTTLFiles.IndexOf(filename);
                if (idx >= 0)
                    RecentSimTTLFiles.RemoveAt(idx);
            }
            tsmiFile.DropDown.Close();
            SetEnabled(true);
        }

        /// <summary>
        /// ToolStripMenuItem click handler for the Save SimTTL File menu item.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiSaveSimTTLFile_Click(object sender, EventArgs e)
        {
            if (sfdSimTTLFile.ShowDialog() == DialogResult.OK)
            {
                SetEnabled(false);
                UpdateSimTTLFiles(sfdSimTTLFile.FileName);
                SimTTLFile sttlf = new SimTTLFile(this);
                sttlf.SaveSimTTLFile(sfdSimTTLFile.FileName);
                SetEnabled(true);
            }
            tsmiFile.DropDown.Close();
        }

        /// <summary>
        /// ToolStripMenuItem click handler for the LoadConfiguration menu item.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiLoadConfiguration_Click(object sender, EventArgs e)
        {
        }

        /// <summary>
        /// ToolStripMenuItem click handler for the SaveConfiguration menu item.
        /// Save the current settings.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiSaveCurrentSettings_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            SaveCurrentSettings();
            tsmiFile.DropDown.Close();
            SetEnabled(true);
        }

        /// <summary>
        /// ToolStripMenuItem click handler for the Export Connections menu item.
        /// Writes all circuit pins and their connections of the current schematics to a comma separated file.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiExportConnections_Click(object sender, EventArgs e)
        {
            new ExportConnections(this, Application.StartupPath + "\\Connections.csv");
        }


        /// <summary>
        /// ToolStripMenuItem "Print" click event handler to open the print dialog and print the street map to the selected printer.
        /// </summary>
        /// <param name="sender">Sender of the event.</param>
        /// <param name="e">Event arguments.</param>
        private void tsmiPrintSetup_Click(object sender, EventArgs e)
        {
            if (psPrintSetup.PrinterSettings == null)
                psPrintSetup.PrinterSettings = new PrinterSettings();

            psPrintSetup.PageSettings = (PageSettings)AppSettings.PrintPageSettings.Clone();

            if (psPrintSetup.ShowDialog() == DialogResult.OK)
            {
                AppSettings.PrintPageSettings = (PageSettings)psPrintSetup.PageSettings.Clone();
                AppSettings.SaveSettings();
            }
        }
#if XXXX
        /// <summary>
        /// ToolStripMenuItem "Print" click event handler to open the print dialog and print the street map to the selected printer.
        /// </summary>
        /// <param name="sender">Sender of the event.</param>
        /// <param name="e">Event arguments.</param>
        private void tsmiPrint_Click(object sender, EventArgs e)
        {
            PrintStreetMap printMap = new PrintStreetMap(pdPrintStreepMap, StreetMap, AppSettings, sender == tsmiTestPrint);
            pdPrintStreepMap.Document = printMap.PrintDocument;
            pdPrintStreepMap.PrinterSettings.FromPage = 1;
            pdPrintStreepMap.PrinterSettings.ToPage = printMap.TotalPages;

            bool showPageLimits = tsmiShowPageLimits.Checked;
            tsmiShowPageLimits.Checked = true;
            this.Refresh();

            if (pdPrintStreepMap.ShowDialog() == DialogResult.OK)
            {
                SetEnabled(false);
                printMap.Print();
                SetEnabled(true);
            }
            tsmiShowPageLimits.Checked = showPageLimits;
        }
#endif
        /// <summary>
        /// Creates a bitmap similar to the screen contents, but with printer specific colors.
        /// </summary>
        /// <param name="CurrentViewOnly">True, to only print what is currently on the screen. False, to print everything.</param>
        /// <returns>Bitmap created for printing.</returns>
        private Bitmap CreatePrintBitmap(bool CurrentViewOnly)
        {
            Bitmap bmPrint;
            Bitmap bmNames = null, bmValues = null, bmGraphs = null, bmGraphRuler = null;
            drawIdx = 1;
            int wNames = DisplaySignalNames(ref bmNames, null);
            int wValues = DisplaySignalValues(ref bmValues, null, CursorMarker.Time >= 0 ? CursorMarker.Time : DataTime);
            DisplaySignalGraphs(ref bmGraphs, null);
            DrawSignalGraphMarkers(Graphics.FromImage(bmGraphs));
            DisplaySignalGraphRuler(ref bmGraphRuler, null);
            MouseX = -1;
            DrawSignalGraphRulerMarkers(Graphics.FromImage(bmGraphRuler));
            drawIdx = 0;
            wNames = Math.Min(wNames, pnSignalNames.ClientSize.Width);
            wValues = Math.Min(wValues, pnSignalValues.ClientSize.Width);
            int wGraphs = pnSignalGraphs.ClientSize.Width;
            int hRuler = bmGraphRuler.Height;
            int hmin = GetBitmapMinHeight(ExpandAll);
            int hView = Math.Min(hmin, pnSignalGraphs.ClientSize.Height);

            if (CurrentViewOnly)
            {
                bmPrint = new Bitmap(wNames + wValues + wGraphs, hRuler + hView);
                Graphics grfx = Graphics.FromImage(bmPrint);
                grfx.Clear(Color.White);
                grfx.DrawImage(bmNames, 0, hRuler, new Rectangle(0, -pbSignalGraphs.Location.Y, wNames, hView), GraphicsUnit.Pixel);
                grfx.DrawImage(bmValues, wNames, hRuler, new Rectangle(0, -pbSignalGraphs.Location.Y, wValues, hView), GraphicsUnit.Pixel);
                grfx.DrawImage(bmGraphs, wNames + wValues, hRuler, new Rectangle(-pbSignalGraphs.Location.X, -pbSignalGraphs.Location.Y, wGraphs, hView), GraphicsUnit.Pixel);
                grfx.DrawImage(bmGraphRuler, wNames + wValues, 0, new Rectangle(-pbSignalGraphs.Location.X, 0, wGraphs, hRuler), GraphicsUnit.Pixel);

                grfx.DrawLine(new Pen(Color.LightGray, 2), wNames, 0, wNames, bmPrint.Height);
                grfx.DrawLine(new Pen(Color.LightGray, 2), wNames + wValues, 0, wNames + wValues, bmPrint.Height);
                grfx.DrawLine(new Pen(Color.LightGray, 2), 0, hRuler, bmPrint.Width, hRuler);
                grfx.DrawString("Name", new Font(NameFont, FontStyle.Bold), brushText[1], TEXT_LEFT, hRuler / 2);
                grfx.DrawString("Value", new Font(NameFont, FontStyle.Bold), brushText[1], MARGIN_LEFT + wNames, hRuler / 2);

                bmPrint.Save(Application.StartupPath + "\\PrintView.png");
            }
            else
            {
                bmPrint = new Bitmap(wNames + wValues + bmSignalGraphs.Width, bmGraphs.Height + bmGraphRuler.Height);
                Graphics grfx = Graphics.FromImage(bmPrint);
                grfx.Clear(Color.White);
                grfx.DrawImage(bmNames, 0, hRuler);
                grfx.DrawImage(bmValues, wNames, hRuler);
                grfx.DrawImage(bmGraphs, wNames + wValues, hRuler);
                grfx.DrawImage(bmGraphRuler, wNames + wValues, 0);

                grfx.DrawLine(new Pen(Color.LightGray, 2), wNames, 0, wNames, bmPrint.Height);
                grfx.DrawLine(new Pen(Color.LightGray, 2), wNames + wValues, 0, wNames + wValues, bmPrint.Height);
                grfx.DrawLine(new Pen(Color.LightGray, 2), 0, hRuler, bmPrint.Width, hRuler);
                grfx.DrawString("Name", new Font(NameFont, FontStyle.Bold), brushText[1], TEXT_LEFT, hRuler / 2);
                grfx.DrawString("Value", new Font(NameFont, FontStyle.Bold), brushText[1], MARGIN_LEFT + wNames, hRuler / 2);

                bmPrint.Save(Application.StartupPath + "\\PrintAll.png");
            }

            return bmPrint;
        }

        /// <summary>
        /// ToolStripMenuItem click handler to print everything.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiPrint_Click(object sender, EventArgs e)
        {
            Bitmap bmPrint = CreatePrintBitmap(sender == tsmiPrintView);
            PrintContents pc = new PrintContents(pdPrintContents, bmPrint, AppSettings);
            pdPrintContents.Document = pc.PrintDocument;
            pdPrintContents.PrinterSettings.FromPage = 1;
            pdPrintContents.PrinterSettings.ToPage = pc.TotalPages;
            pdPrintContents.AllowSomePages = true;
            pdPrintContents.PrinterSettings.DefaultPageSettings.Landscape = AppSettings.PrintPageSettings.Landscape;

            if (pdPrintContents.ShowDialog() == DialogResult.OK)
            {
                SetEnabled(false);
                pc.Print();
                SetEnabled(true);
            }

        }


        /// <summary>
        /// ToolStripMenuItem click handler to exit the application.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiExit_Click(object sender, EventArgs e)
        {
            Close();
        }

#endregion File Menu Handlers

        #region Edit Menu Handlers
        /// <summary>
        /// ToolStripMenuItem click handler for the IncludeInputs menu item.
        /// Updates the display with the new settings of the menu item Checked field.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiIncludeInputs_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            FillSignalList(CurrentSignals);
            UpdateDisplays();
            SetEnabled(true);
        }

        /// <summary>
        /// ToolStripMenuItem click handler for the ExpandAll menu item.
        /// Updates the display with the new settings of the menu item ExpandAll field.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiExpandAll_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            ExpandAll = tsmiExpandAll.Checked;
            UpdateDisplays();
            SetEnabled(true);
        }

        /// <summary>
        /// ToolStripMenuItem click handler for the ShowPinNo menu item.
        /// Updates the display with the new settings of the menu item DisplayPinNo field.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiShowPinNo_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            DisplayPinNo = tsmiShowPinNo.Checked;
            UpdateDisplays();
            SetEnabled(true);
        }
        #endregion Edit Menu Handlers

        #region Simulation Menu Handlers

        /// <summary>
        /// ToolStripMenuItem click handler for the Select Signals menu item.
        /// The frmSignalSelect form is created and filled with the current selection.
        /// If closed with Ok button, the CurrentSignals list will be updated with the signal selection from the form.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiSelectSignals_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            frmSignalSelect form = new frmSignalSelect();
            FillSignalList(form.AllSignals, true, false, true);

            for (int i = 0; i < CurrentSignals.Count; i++)
                form.CurrentSignals.Add(this.CurrentSignals[i]);

            form.ShowLists();

            if (form.ShowDialog() == DialogResult.OK)
            {
                this.CurrentSignals.Clear();

                for (int i = 0; i < form.CurrentSignals.Count; i++)
                    this.CurrentSignals.Add(form.CurrentSignals[i]);

                if (Schematics.Time == 0)
                    RunSimulation();
                else
                    UpdateDisplays();
            }
            SetEnabled(true);
        }

        /// <summary>
        /// ToolStripMenuItem click handler for the Settings menu item.
        /// The frmSettings form is created and filled with the current settings.
        /// If closed with Ok button, the settings will be updated from the form.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiSettings_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            List<DisplaySignal> inputSignals = new List<DisplaySignal>();
            FillSignalList(inputSignals, true, false, false);
            inputSignals.Sort((x, y) => x.ScreenName.CompareTo(y.ScreenName));

            frmSettings form = new frmSettings(this, inputSignals, CurrentSignals, CurrentStimuli, CurrentTriggers);
            form.SimulationInterval = SimulationTimeInterval;
            form.SimulationMaxTime = SimulationMaxTime;
            form.SimulationContinueTime = SimulationContinueTime;
            form.EnableTrigger = Schematics.EnableTrigger;
            form.TriggerPosition = Schematics.TriggerPosition;
            if (form.ShowDialog() == DialogResult.OK)
            {
                CurrentStimuli = form.GetStimuli();
                LinkCurrentStimuli();

                CurrentTriggers = form.GetTriggers();
                if (Schematics != null)
                {
                    Schematics.Triggers = CurrentTriggers;
                    Schematics.EnableTrigger = form.EnableTrigger;
                    Schematics.TriggerPosition = form.TriggerPosition;
                }

                if ((SimulationTimeInterval != form.SimulationInterval) || (SimulationMaxTime != form.SimulationMaxTime))
                {
                    SimulationTimeInterval = form.SimulationInterval;
                    SimulationMaxTime = form.SimulationMaxTime;
                    DisplayMinTime = 0;
                    DisplayMaxTime = SimulationMaxTime;
                    SignalsZoomX = CalcZoom(DisplayMinTime, DisplayMaxTime);
                    pnSignalGraphs.HorizontalScroll.Value = 0;
                    CalcMarkerX();
                    RunSimulation();
                }
            }
            SetEnabled(true);
        }

        /// <summary>
        /// ToolStripMenuItem click handler for the Restart Simulation menu item.
        /// Force the simulation to run again.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiRestartSimulation_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            Schematics.SimulationRestart();
            RunSimulation();
            SetEnabled(true);
        }


        /// <summary>
        /// ToolStripMenuItem click handler for the Continue Simulation menu item.
        /// Force the simulation to continue.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsmiContinueSimulation_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            if (Schematics.Time >= Schematics.MaxTime)
                SimulationMaxTime += SimulationContinueTime;
            RunSimulation();
            SetEnabled(true);
        }

        #endregion Simulation Menu Handlers

        #region Toolstrip Button Event Handlers
        /// <summary>
        /// ToolStripButton click handler for the ExpandAll menu item.
        /// Updates the display with the new settings of the menu item ExpandAll field set.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbExpandAll_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            ExpandAll = true;
            UpdateDisplays();
            SetEnabled(true);
        }

        /// <summary>
        /// ToolStripButton click handler for the CollapseAll menu item.
        /// Updates the display with the new settings of the menu item ExpandAll field cleared.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbCollapseAll_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            ExpandAll = false;
            UpdateDisplays();
            SetEnabled(true);
        }

        /// <summary>
        /// ToolStripButton click handler for the Search button.
        /// Opens a form to enter the search string and return an index into the CurrentSignals list to be brought into the visible screen area.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbSearch_Click(object sender, EventArgs e)
        {
            frmSearchSignal form = new frmSearchSignal();
            form.CurrentSignals = CurrentSignals;
            if (form.ShowDialog() == DialogResult.OK)
            {
                int selIdx = form.SelectedIndex;
                if (selIdx >= 0)
                {
                    CurrentSignals[selIdx].Selected = true;
                    int y = (CurrentSignals[selIdx].TextRect.Y+ CurrentSignals[selIdx].TextRect.Bottom)/2;
                    int topY = y - pnSignalGraphs.Height / 2;
                    topY = Math.Min(Math.Max(topY, 0), pbSignalGraphs.Height - pnSignalGraphs.ClientSize.Height);
                    pnSignalGraphs.VerticalScroll.Value = topY;
                    UpdateDisplays(); 
                }
            }
        }

        /// <summary>
        /// ToolStripButton click handler for the SaveWaveForm button.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbSaveWaveForm_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            SimTTLFile sttlf = new SimTTLFile(this);
            sttlf.SaveSimTTLFile(Application.StartupPath + "\\Backup");
            SetEnabled(true);
        }

        /// <summary>
        /// ToolStripButton click handler for the ZoomIn button.
        /// Multiplies the current SignalsZoomX by two and displays the signal graphs again for zooming in up to a maximum limit.
        /// If a CursorMarker exists in the view, the cursor is kept in the same position. Otherwise the view center is kept in the center.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbZoomIn_Click(object sender, EventArgs e)
        {
            int newMaxWidth = (int)(pbSignalGraphs.Width * 2);
            if (newMaxWidth < ushort.MaxValue)
            {
                SetEnabled(false);
                this.SuspendLayout();
                try
                {
                    int leftX = -pbSignalGraphs.Location.X;
                    int x0;
                    double time;
                    if (CursorMarker.X < 0)
                    {
                        x0 = pnSignalGraphs.ClientSize.Width / 2;
                        time = X2Time(x0+leftX);
                    }
                    else
                    {
                        x0 = CursorMarker.X - leftX;
                        time = CursorMarker.Time;
                    }

                    SignalsZoomX *= 2;
                    int xx = (int)Time2X(time);
                    leftX = Math.Min(Math.Max(xx - x0, 0), newMaxWidth); // - pnSignalGraphs.Width);
                    label4.Text = "Zoom=" + SignalsZoomX.ToString("F6") + " xx=" + xx.ToString() + " x0=" + x0.ToString() + "  leftX="+ leftX.ToString()+ "  newMaxWidth =" + newMaxWidth.ToString();

                    DisplaySignalGraphs(ref bmSignalGraphs, pbSignalGraphs);
                    DisplaySignalGraphRuler(ref bmSignalGraphRuler, pbSignalGraphRuler);

                    pnSignalGraphs.HorizontalScroll.Value = leftX;

                    CalcMarkerX();
                }
                catch { } 
                this.ResumeLayout();
                SetEnabled(true);
            }
        }

        /// <summary>
        /// ToolStripButton click handler for the ZoomOut button.
        /// Divides the current SignalsZoomX by two and displays the signal graphs again for zooming in up to a minimum limit.
        /// If a CursorMarker exists in the view, the cursor is kept in the same position. Otherwise the view center is kept in the center.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbZoomOut_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            this.SuspendLayout();

            int leftX = -pbSignalGraphs.Location.X;
            int x0 = pnSignalGraphs.ClientSize.Width / 2;
            if (CursorMarker.X >= 0)
                x0 = CursorMarker.X - leftX;

            double minZoom = CalcZoom(DisplayMinTime, DisplayMaxTime);
            if ((SignalsZoomX / 2) < minZoom)
            {
                SignalsZoomX = minZoom;
                leftX = 0;
            }
            else
            {
                SignalsZoomX /= 2;
                leftX = Math.Min(Math.Max((x0 + leftX) / 2 - x0, 0), pbSignalGraphs.Width - pnSignalGraphs.ClientSize.Width);
            }
            label4.Text = "Zoom=" + SignalsZoomX.ToString("F6")  + " x0=" + x0.ToString() + "  w=" + pnSignalGraphs.ClientSize.Width.ToString();

            DisplaySignalGraphs(ref bmSignalGraphs, pbSignalGraphs);
            DisplaySignalGraphRuler(ref bmSignalGraphRuler, pbSignalGraphRuler);

            pnSignalGraphs.HorizontalScroll.Value = leftX;

            CalcMarkerX();

            this.ResumeLayout();
            SetEnabled(true);
        }

        /// <summary>
        /// ToolStripButton click handler for the ZoomFit button.
        /// Calculates a SignalsZoomX value to fit the DisplayMinTime to DisplayMaxTime range into the screen area and redraws all.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbZoomFit_Click(object sender, EventArgs e)
        {
            SetEnabled(false);
            this.SuspendLayout();
            DisplayMinTime = 0;
            DisplayMaxTime = SimulationMaxTime;
            SignalsZoomX = CalcZoom(DisplayMinTime, DisplayMaxTime);
            pnSignalGraphs.HorizontalScroll.Value = 0;
            DisplaySignalGraphs(ref bmSignalGraphs, pbSignalGraphs);
            DisplaySignalGraphRuler(ref bmSignalGraphRuler, pbSignalGraphRuler);
            CalcMarkerX();
            pbSignalGraphs.Location = new Point(0, pbSignalGraphs.Location.Y);
            this.ResumeLayout();
            SetEnabled(true);
        }

        /// <summary>
        /// ToolStripButton click handler for the UnselectAll button.
        /// Clears the Selected fields of all signals.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbUnselectAll_Click(object sender, EventArgs e)
        {
            SetAllSignalSelects(false);
        }

        /// <summary>
        /// ToolStripButton click handler for the GotoCursor button.
        /// Bring the CursorMarker into the visible screen area.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbGotoCursor_Click(object sender, EventArgs e)
        {
            if (CursorMarker.X >= 0)
            {
                int leftX = CursorMarker.X - (pnSignalGraphs.ClientSize.Width / 2);
                leftX = Math.Min(Math.Max(leftX, 0), pbSignalGraphs.Width - pnSignalGraphs.ClientSize.Width);
                pnSignalGraphs.HorizontalScroll.Value = leftX;
                pbSignalGraphs.Invalidate();
                pbSignalGraphRuler.Invalidate();
            }
        }

        /// <summary>
        /// ToolStripButton click handler for the GotoZero button.
        /// Left align the signal graph area from 0 on.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbGotoZero_Click(object sender, EventArgs e)
        {
            CursorMarker.X = 0;
            CursorMarker.Time = X2Time(0);
            pnSignalGraphs.HorizontalScroll.Value = 0;
            pbSignalGraphs.Invalidate();
            pbSignalGraphRuler.Invalidate();
        }

        /// <summary>
        /// ToolStripButton click handler for the GotoLast button.
        /// Right align the signal graph area to the last time on the right.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbGotoLast_Click(object sender, EventArgs e)
        {
            CursorMarker.Time = SimulationMaxTime;
            CursorMarker.X = (int)Time2X(SimulationMaxTime);
            int leftX = Math.Min( 0, pbSignalGraphs.Width - pnSignalGraphs.ClientSize.Width);
            pnSignalGraphs.HorizontalScroll.Value = leftX;
            pbSignalGraphs.Invalidate();
            pbSignalGraphRuler.Invalidate();
        }

        /// <summary>
        /// ToolStripButton click handler for the PrevTransistion button.
        /// Move the cursor to the next left transition of the selected signal graph.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbPrevTransistion_Click(object sender, EventArgs e)
        {
            if (CursorMarker.Time >= 0)
            {
                double time0= CursorMarker.Time, dt0 = double.MaxValue;
                List<int> indices = GetSelectedSignalIndices();
                if (indices.Count > 0)
                {
                    for (int i = 0; i < indices.Count; i++)
                    {
                        for (int j = 0; j < CurrentSignals[indices[i]].DisplayPins.Length; j++)
                        {
                            int idx = CurrentSignals[indices[i]].DisplayPins[j].Pin.History.FindIndex(CursorMarker.Time);
                            while ((idx >0) && (CurrentSignals[indices[i]].DisplayPins[j].Pin.History[idx].Time >= CursorMarker.Time))
                                idx--;
                            double time = CurrentSignals[indices[i]].DisplayPins[j].Pin.History[idx].Time;
                            double dt = CursorMarker.Time - time;
                            if ((dt > 0) && (dt < dt0))
                            {
                                time0 = time;
                                dt0 = dt;
                            }
                        }
                    }
                    CursorMarker.Time = time0;
                    CursorMarker.X = (int)Time2X(time0);
                    int leftX = -pbSignalGraphs.Location.X;
                    if (CursorMarker.X < leftX)
                    {
                        leftX = CursorMarker.X - (pnSignalGraphs.ClientSize.Width / 2);
                        leftX = Math.Min(Math.Max(leftX, 0), pbSignalGraphs.Width - pnSignalGraphs.ClientSize.Width);
                        pnSignalGraphs.HorizontalScroll.Value = leftX;
                    }
                    pbSignalGraphs.Invalidate();
                    pbSignalGraphRuler.Invalidate();
                }
            }
        }

        /// <summary>
        /// ToolStripButton click handler for the NextTransistion button.
        /// Move the cursor to the next right transition of the selected signal graph.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbNextTransition_Click(object sender, EventArgs e)
        {
            if (CursorMarker.Time >= 0)
            {
                if (CursorMarker.Time >= 0)
                {
                    double time0 = CursorMarker.Time, dt0 = double.MaxValue;
                    List<int> indices = GetSelectedSignalIndices();
                    if (indices.Count > 0)
                    {
                        for (int i = 0; i < indices.Count; i++)
                        {
                            for (int j = 0; j < CurrentSignals[indices[i]].DisplayPins.Length; j++)
                            {
                                int idx = CurrentSignals[indices[i]].DisplayPins[j].Pin.History.FindIndex(CursorMarker.Time);
                                while ((idx < CurrentSignals[indices[i]].DisplayPins[j].Pin.History.Count - 1) && (CurrentSignals[indices[i]].DisplayPins[j].Pin.History[idx].Time<=CursorMarker.Time))
                                    idx++;
                                double time = CurrentSignals[indices[i]].DisplayPins[j].Pin.History[idx].Time;
                                double dt = time-CursorMarker.Time;
                                if ((dt > 0) && (dt < dt0))
                                {
                                    time0 = time;
                                    dt0 = dt;
                                }
                            }
                        }
                        CursorMarker.Time = time0;
                        CursorMarker.X = (int)Time2X(time0);
                        int leftX = -pbSignalGraphs.Location.X;
                        if (CursorMarker.X > pnSignalGraphs.ClientSize.Width + leftX)
                        {
                            leftX = CursorMarker.X - (pnSignalGraphs.ClientSize.Width / 2);
                            leftX = Math.Min(Math.Max(leftX, 0), pbSignalGraphs.Width - pnSignalGraphs.ClientSize.Width);
                            pnSignalGraphs.HorizontalScroll.Value = leftX;
                        }
                        pbSignalGraphs.Invalidate();
                        pbSignalGraphRuler.Invalidate();
                    }
                }
            }
        }

        /// <summary>
        /// ToolStripButton click handler for the AddMarker button.
        /// Create a new marker in the center of the signal graph area.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbAddMarker_Click(object sender, EventArgs e)
        {
            Marker marker = new Marker();
            int leftX = -pbSignalGraphs.Location.X;
            marker.X = leftX + pnSignalGraphs.ClientRectangle.Width / 2;
            marker.Y = -1;
            marker.Time = X2Time(marker.X);
            Markers.Add(marker);
            pbSignalGraphs.Refresh();
            pbSignalGraphRuler.Refresh();
        }

        /// <summary>
        /// ToolStripButton click handler for the PrevMarker button.
        /// Bring the previous marker into the signal graph area.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbPrevMarker_Click(object sender, EventArgs e)
        {
            int leftX = -pbSignalGraphs.Location.X;
            int x0 = leftX + pnSignalGraphs.ClientSize.Width / 2;
            int idxSel = -1;
            for (int i = 0; i < Markers.Count; i++)
                if ((Markers[i].X >= 0) && (Markers[i].Selected == true))
                {
                    x0 = Markers[i].X;
                    idxSel = i;
                    break;
                }

            int idx = -1, dx0 = int.MaxValue;
            for (int i = 0; i < Markers.Count; i++)
            {
                if (Markers[i].X >= 0)
                {
                    int dx = x0 - Markers[i].X;
                    if ((dx > 0) && (dx < dx0))
                    {
                        dx0 = dx;
                        idx = i;
                    }
                }
            }

            if (idx>=0)
            {
                if (idxSel >= 0)
                    Markers[idxSel].Selected = false;

                Markers[idx].Selected = true;
                leftX = Markers[idx].X - (pnSignalGraphs.ClientSize.Width / 2);
                leftX = Math.Min(Math.Max(leftX, 0), pbSignalGraphs.Width - pnSignalGraphs.ClientSize.Width);
                pnSignalGraphs.HorizontalScroll.Value = leftX;
                pbSignalGraphs.Invalidate();
                pbSignalGraphRuler.Invalidate();
            }
        }

        /// <summary>
        /// ToolStripButton click handler for the NextMarker button.
        /// Bring the next marker into the signal graph area.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbNextMarker_Click(object sender, EventArgs e)
        {
            int leftX = -pbSignalGraphs.Location.X;
            int x0 = leftX + pnSignalGraphs.ClientSize.Width / 2;
            int idxSel = -1;
            for (int i = 0; i < Markers.Count; i++)
                if ((Markers[i].X >= 0) && (Markers[i].Selected == true))
                {
                    x0 = Markers[i].X;
                    idxSel = i;
                    break;
                }

            int idx = -1, dx0 = int.MaxValue;
            for (int i = 0; i < Markers.Count; i++)
            {
                if (Markers[i].X >= 0)
                {
                    int dx = Markers[i].X- x0;
                    if ((dx > 0) && (dx < dx0))
                    {
                        dx0 = dx;
                        idx = i;
                    }
                }
            }

            if (idx >= 0)
            {
                if (idxSel >= 0)
                    Markers[idxSel].Selected = false;

                Markers[idx].Selected = true;
                leftX = Markers[idx].X - (pnSignalGraphs.ClientSize.Width / 2);
                leftX = Math.Min(Math.Max(leftX, 0), pbSignalGraphs.Width - pnSignalGraphs.ClientSize.Width);
                pnSignalGraphs.HorizontalScroll.Value = leftX;
                pbSignalGraphs.Invalidate();
                pbSignalGraphRuler.Invalidate();
            }
        }

        /// <summary>
        /// ToolStripButton click handler for the DeleteAllMarkers button.
        /// Delete all current markers.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbDeleteAllMarkers_Click(object sender, EventArgs e)
        {
            Markers.Clear();
            pbSignalGraphs.Refresh();
            pbSignalGraphRuler.Refresh();
        }

        /// <summary>
        /// ToolStripButton click handler for the DeleteSelected button.
        /// Delete the cuurently selected signals.
        /// </summary>
        /// <param name="sender">Reference to the sender object.</param>
        /// <param name="e">Event argument passed with the call.</param>
        private void tsbDeleteSelected_Click(object sender, EventArgs e)
        {
            for (int i = CurrentSignals.Count-1; i >=0; i--)
            {
                if (CurrentSignals[i].Selected == true)
                    CurrentSignals.RemoveAt(i);
            }
            UpdateDisplays();
        }

        #endregion Toolstrip Button Event Handlers

        #region Public Properties
        /// <summary>
        /// Gets the Horizontal scroll value of the SignalGraph.
        /// </summary>
        internal int SignalGraphHscrollValue
        {
            get { return pnSignalGraphs.HorizontalScroll.Value; }
            set { pnSignalGraphs.HorizontalScroll.Value = value; }
        }

        /// <summary>
        /// Gets the Vertical scroll value of the SignalGraph.
        /// </summary>
        internal int SignalGraphVscrollValue
        {
            get { return pnSignalGraphs.VerticalScroll.Value; }
            set { pnSignalGraphs.VerticalScroll.Value = value; }
        }

        /// <summary>
        /// If true, the Netlist import form will be closed automatically after import.
        /// </summary>
        internal bool AutoCloseImportForm
        {
            get { return tsmiAutoCloseImportForm.Checked; }
            set { tsmiAutoCloseImportForm.Checked = value; }
        }



        #endregion Public Properties


    }
}
