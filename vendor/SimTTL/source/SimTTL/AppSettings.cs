// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Drawing.Printing;
using System.Drawing;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Xml;
using System.IO;
using SimBase;
using Schematics;

namespace SimTTL
{
    /// <summary>
    /// Storage class for all customizable parameter for drawing and GUI. All public fields can be read from an XML file at startup and written to the XML file at any time.
    /// </summary>
    public class AppSettings
    {
        #region Public Constants
        /// <summary>Identifer string that is stored into the XML file.</summary>
        public const string XML_FILE_ID_STR = "SimTTL_AppSettings";
        #endregion Public Constants

        #region Public Fields
        /// <summary>Identifier for the source of this schematics.</summary>
        public SchematicsSource SchematicsSource;
        /// <summary>Name of the schematics selected as default.</summary>
        public string SchematicsName = "Gigatron";
        /// <summary>Full file name of the netlist to be imported.</summary>
        public string NetlistFileName = "";
        /// <summary>Full file name of the SimTTL file to load.</summary>
        public string SimTTLFileName = "";

        /// <summary>The simulation time interval is the time step of the simulation.</summary>
        public double SimulationTimeInterval = 1;
        /// <summary>The simulation max time interval is the viewing time window of the signal graph area.</summary>
        public double SimulationMaxTime = 10000;
        /// <summary>The time interval to add to the current max time for continuing the simulation.</summary>
        public double SimulationContinueTime = 1000;
        /// <summary>Enables or disables the trigger functions</summary>
        public bool EnableTrigger = false;
        /// <summary>Position of the trigger event.</summary>
        public double TriggerPosition = 1000;

        /// <summary>This variable handles the current zoom factor. 1.0 means one SimulationTimeInterval step is displayed as a dx=1</summary>
        public double SignalsZoomX = 1;

        /// <summary>The X offset of the current signal view.</summary>
        public int SignalGraphsLocationX = 0;
        /// <summary>The Y offset of the current signal view.</summary>
        public int SignalGraphsLocationY = 0;

        /// <summary>Signal graph minimum time on the left of the graph.</summary>
        public double DisplayMinTime = 0;
        /// <summary>Signal graph maximum time on the right of the graph.</summary>
        public double DisplayMaxTime = 10000;

        /// <summary>If set to true, all bus grouping will be expanded with the next drawing.</summary>
        public bool ExpandAll = false;
        /// <summary>If set to true, all input signals will be available for drawing.</summary>
        public bool IncludeInputs = false;
        /// <summary>If set to true, the pin numbers will be added to the signal names.</summary>
        public bool DisplayPinNo = true;
        /// <summary>If set to true, the Net import logging form will be closed automatically.</summary>
        public bool AutoCloseImportForm = false;


        /// <summary>Reference to the cursor marker.</summary>
        public Marker CursorMarker;
        /// <summary>List of all current marker objects.</summary>
        public List<Marker> Markers;
        /// <summary>List of all currently displayed signals.</summary>
        public List<DisplaySignal> CurrentSignals;
        /// <summary>List of all currently used stimulus objects.</summary>
        public List<Stimulus> CurrentStimuli;
        /// <summary>List of all currently used trigger objects.</summary>
        public List<Trigger> CurrentTriggers;

        /// <summary>List of recently imported KiCad Netlist Files.</summary>
        public List<string> RecentKiCadFiles;
        /// <summary>List of recently saved SimTTLFiles.</summary>
        public List<string> RecentSimTTLFiles;


        /// <summary>Page settings to be used in street map printing.</summary>
        public PageSettings PrintPageSettings = new PageSettings();

        #endregion Public Fields

        #region Private Fields
        /// <summary>Full file name of the application settings XML file.</summary>
        private string fileName;
        /// <summary>True, if the file existed.</summary>
        private bool fileExisted;
        /// <summary>True, if the file could be loaded correctly.</summary>
        private bool fileLoadedCorrectly;
        #endregion Private Fields

        #region Constructor
        /// <summary>
        /// Creates an instance of the AppSettings class just with the defaults.
        /// </summary>
        public AppSettings()
        {
            fileLoadedCorrectly = false;
            fileExisted = false;

            CursorMarker = new Marker();
            Markers = new List<Marker>();
            CurrentSignals = new List<DisplaySignal>();
            CurrentStimuli = new List<Stimulus>();
            CurrentTriggers = new List<Trigger>();
            RecentKiCadFiles = new List<string>();
            RecentSimTTLFiles = new List<string>();
        }


        /// <summary>
        /// Creates an instance of the AppSettings class and reads in the XML file to all public fields if the file exists. If the file does not exist, if will be created and all defaulted fields will be written to it.
        /// </summary>
        /// <param name="FileName">Full file name of the application settings XML file.</param>
        public AppSettings(string FileName) : this()
        {
            fileName = FileName;
            //SaveSettings();
            //fileLoadedCorrectly = false;
            fileExisted = File.Exists(fileName);
            if (fileExisted)
                LoadSettings();
        }
        #endregion Constructor

        #region Public Methods
        /// <summary>
        /// Copies the contents of all public fields of this object to the target object.
        /// </summary>
        /// <param name="Target">Target AppSettings object to copy to.</param>
        public void CopyTo(AppSettings Target)
        {
            foreach (var s in this.GetType().GetFields(BindingFlags.Public | BindingFlags.Instance))
                Target.GetType().GetField(s.Name).SetValue(Target, s.GetValue(this));
        }

        /// <summary>
        /// Build the schematics specific settings file name.
        /// </summary>
        public string SchematicsFileName
        {
            get { return Path.ChangeExtension(fileName, SchematicsName + ".xml"); }
        }

        /// <summary>
        /// Reads the XML file given via the constructor and loads all public fields from that file. The property FileLoadedCorrectly will be set accordingly.
        /// </summary>
        public void LoadSettings()
        {
            fileExisted = File.Exists(fileName);
            if (fileExisted == false)
                return;

            fileLoadedCorrectly = false;
            XmlDocument doc = new XmlDocument();
            try
            {
                doc.Load(fileName);

                XmlNode nodeSettings = doc.SelectSingleNode("settings");
                string id = nodeSettings.SelectSingleNode("identifier").InnerText;
                if (id != XML_FILE_ID_STR)
                    throw new Exception("XML file identifier error!");

                try
                {
                    SchematicsSource = (SchematicsSource)Enum.Parse(typeof(SchematicsSource), nodeSettings.SelectSingleNode("schematics_source").InnerText);
                }
                catch
                {
                    SchematicsSource = SchematicsSource.NetlistImport;
                }

                try
                {
                    SchematicsName = nodeSettings.SelectSingleNode("schematics_name").InnerText;
                }
                catch
                {
                    SchematicsName = nodeSettings.SelectSingleNode("selected_schematics").InnerText;
                }

                try
                {
                    NetlistFileName = nodeSettings.SelectSingleNode("netlist_filename").InnerText;
                }
                catch { }

                try
                {
                    SimTTLFileName = nodeSettings.SelectSingleNode("simttl_filename").InnerText;
                }
                catch { }

                RecentKiCadFiles.Clear();
                try
                {
                    XmlNode nodeRecentKiCad = nodeSettings.SelectSingleNode("recent_kicad_files");
                    XmlNodeList kicadItems = nodeRecentKiCad.SelectNodes("item");
                    foreach (XmlNode kicadItem in kicadItems)
                    {
                        RecentKiCadFiles.Add(kicadItem.InnerText);
                    }
                }
                catch { }


                RecentSimTTLFiles.Clear();
                try
                {
                    XmlNode nodeRecentSimTTL = nodeSettings.SelectSingleNode("recent_simttl_files");
                    XmlNodeList simttlItems = nodeRecentSimTTL.SelectNodes("item");
                    foreach (XmlNode simttlItem in simttlItems)
                    {
                        RecentSimTTLFiles.Add(simttlItem.InnerText);
                    }
                }
                catch { }

                try
                {
                    XmlNode nodePrintSettings = nodeSettings.SelectSingleNode("print_settings");
                    XmlNode nodePrintPaperSource = nodePrintSettings.SelectSingleNode("paper_source");
                    PrintPageSettings.PaperSource.RawKind = Convert.ToInt32(nodePrintPaperSource.SelectSingleNode("raw_kind").InnerText);
                    PrintPageSettings.PaperSource.SourceName = nodePrintPaperSource.SelectSingleNode("name").InnerText;

                    XmlNode nodePrintPaperSize = nodePrintSettings.SelectSingleNode("paper_size");
                    int rawKind = Convert.ToInt32(nodePrintPaperSize.SelectSingleNode("raw_kind").InnerText);
                    string paperName = nodePrintPaperSize.SelectSingleNode("name").InnerText;
                    int paperWidth = Convert.ToInt32(nodePrintPaperSize.SelectSingleNode("width").InnerText);
                    int paperHeight = Convert.ToInt32(nodePrintPaperSize.SelectSingleNode("height").InnerText);
                    PrintPageSettings.PaperSize = new PaperSize(paperName, paperWidth, paperHeight);
                    PrintPageSettings.PaperSize.RawKind = rawKind;

                    XmlNode nodePrintMargins = nodePrintSettings.SelectSingleNode("margins");
                    PrintPageSettings.Margins.Left = Convert.ToInt32(nodePrintMargins.SelectSingleNode("left").InnerText);
                    PrintPageSettings.Margins.Top = Convert.ToInt32(nodePrintMargins.SelectSingleNode("top").InnerText);
                    PrintPageSettings.Margins.Right = Convert.ToInt32(nodePrintMargins.SelectSingleNode("right").InnerText);
                    PrintPageSettings.Margins.Bottom = Convert.ToInt32(nodePrintMargins.SelectSingleNode("bottom").InnerText);

                    PrintPageSettings.Landscape = Convert.ToBoolean(nodePrintSettings.SelectSingleNode("landscape").InnerText);
                    PrintPageSettings.Color = Convert.ToBoolean(nodePrintSettings.SelectSingleNode("color").InnerText);
                }
                catch { }

                fileLoadedCorrectly = LoadSchematics();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error when loading Settings");
            }
        }

        /// <summary>
        /// Load the schematics settings file.
        /// </summary>
        /// <returns>True, if file had been loaded successfully.</returns>
        public bool LoadSchematics()
        {
            if (SchematicsName == "")
                return false;
            return LoadSchematics(SchematicsFileName);
        }

        /// <summary>
        /// Load the schematics settings file.
        /// </summary>
        /// <param name="FileName">Full file name of the schematics settings file.</param>
        /// <returns>True, if file had been loaded successfully.</returns>
        public bool LoadSchematics(string FileName)
        {
            bool loaded = false;
            if (File.Exists(FileName) == false)
                return loaded;

            XmlDocument doc = new XmlDocument();
            try
            {
                doc.Load(FileName);

                XmlNode nodeSettings = doc.SelectSingleNode("settings");
                string id = nodeSettings.SelectSingleNode("identifier").InnerText;
                if (id != XML_FILE_ID_STR)
                    throw new Exception("XML file identifier error!");

                try
                {
                    SchematicsSource = (SchematicsSource)Enum.Parse(typeof(SchematicsSource), nodeSettings.SelectSingleNode("schematics_source").InnerText); 
                }
                catch 
                {
                    SchematicsSource = SchematicsSource.NetlistImport;
                }

                try
                {
                    SchematicsName = nodeSettings.SelectSingleNode("schematics_name").InnerText;
                }
                catch
                {
                    SchematicsName = nodeSettings.SelectSingleNode("selected_schematics").InnerText;
                }

                try
                {
                    NetlistFileName = nodeSettings.SelectSingleNode("netlist_filename").InnerText;
                }
                catch { }

                try
                {
                    SimTTLFileName = nodeSettings.SelectSingleNode("digism_filename").InnerText;
                }
                catch { }

                XmlNode nodeSchematics = nodeSettings.SelectSingleNode("schematics");
                XmlNode nodeSelelectedSchematics = nodeSchematics.SelectSingleNode(SchematicsName);
                SimulationTimeInterval = Convert.ToDouble(nodeSelelectedSchematics.SelectSingleNode("simulation_time_interval").InnerText);
                SimulationMaxTime = Convert.ToDouble(nodeSelelectedSchematics.SelectSingleNode("simulation_max_time").InnerText);
                try
                {
                    SimulationContinueTime = Convert.ToDouble(nodeSelelectedSchematics.SelectSingleNode("simulation_continue_time").InnerText);
                    EnableTrigger = Convert.ToBoolean(nodeSelelectedSchematics.SelectSingleNode("simulation_enable_trigger").InnerText);
                    TriggerPosition =  Convert.ToDouble(nodeSelelectedSchematics.SelectSingleNode("simulation_trigger_position").InnerText);
                }
                catch { }
                SignalsZoomX = Convert.ToDouble(nodeSelelectedSchematics.SelectSingleNode("signals_zoom_x").InnerText);
                try
                {
                    SignalGraphsLocationX = Convert.ToInt32(nodeSelelectedSchematics.SelectSingleNode("signals_graph_loc_x").InnerText);
                    SignalGraphsLocationY = Convert.ToInt32(nodeSelelectedSchematics.SelectSingleNode("signals_graph_loc_y").InnerText);
                }
                catch { }
                DisplayMinTime = Convert.ToDouble(nodeSelelectedSchematics.SelectSingleNode("display_min_time").InnerText);
                DisplayMaxTime = Convert.ToDouble(nodeSelelectedSchematics.SelectSingleNode("display_max_time").InnerText);
                ExpandAll = Convert.ToBoolean(nodeSelelectedSchematics.SelectSingleNode("expand_all").InnerText);
                IncludeInputs = Convert.ToBoolean(nodeSelelectedSchematics.SelectSingleNode("include_inputs").InnerText);
                DisplayPinNo = Convert.ToBoolean(nodeSelelectedSchematics.SelectSingleNode("display_pin_no").InnerText);
                try
                {
                    AutoCloseImportForm = Convert.ToBoolean(nodeSelelectedSchematics.SelectSingleNode("auto_close_import_form").InnerText);
                }
                catch { }

                XmlNode nodeCursor = nodeSelelectedSchematics.SelectSingleNode("cursor");
                if ((nodeCursor != null) && (nodeCursor.HasChildNodes == true))
                {
                    CursorMarker.Time = Convert.ToDouble(nodeCursor.SelectSingleNode("time").InnerText);
                    CursorMarker.X = Convert.ToInt32(nodeCursor.SelectSingleNode("x").InnerText);
                    CursorMarker.Selected = Convert.ToBoolean(nodeCursor.SelectSingleNode("selected").InnerText);
                }

                Markers.Clear();
                XmlNode nodeMarkers = nodeSelelectedSchematics.SelectSingleNode("markers");
                XmlNodeList markerItems = nodeMarkers.SelectNodes("item");
                foreach (XmlNode markerItem in markerItems)
                {
                    Marker marker = new Marker();
                    marker.Time = Convert.ToDouble(markerItem.Attributes["time"].Value);
                    marker.X = Convert.ToInt32(markerItem.Attributes["x"].Value);
                    marker.Selected = Convert.ToBoolean(markerItem.Attributes["selected"].Value);
                    Markers.Add(marker);
                }

                CurrentSignals.Clear();
                XmlNode nodeSelectedSignals = nodeSelelectedSchematics.SelectSingleNode("current_signals");
                XmlNodeList signalItems = nodeSelectedSignals.SelectNodes("item");
                foreach (XmlNode signalItem in signalItems)
                {
                    DisplaySignal signal = new DisplaySignal(signalItem.InnerText);
                    signal.Radix = (RadixType)Enum.Parse(typeof(RadixType), signalItem.Attributes["radix"].Value);
                    try
                    {
                        signal.Invert = Convert.ToBoolean(signalItem.Attributes["invert"].Value);
                        signal.Reverse = Convert.ToBoolean(signalItem.Attributes["reverse"].Value);
                        signal.Highlight = Convert.ToBoolean(signalItem.Attributes["highlight"].Value);
                    }
                    catch { }
                    signal.Expanded = Convert.ToBoolean(signalItem.Attributes["expanded"].Value);
                    CurrentSignals.Add(signal);
                }


                CurrentStimuli.Clear();
                try
                {
                    XmlNode nodeCurrentStimuli = nodeSelelectedSchematics.SelectSingleNode("current_stimuli");
                    XmlNodeList stimulusItems = nodeCurrentStimuli.SelectNodes("item");
                    foreach (XmlNode stimulusItem in stimulusItems)
                    {
                        string screenName = stimulusItem.InnerText;
                        int bits = Convert.ToInt32(stimulusItem.Attributes["bits"].Value);
                        Stimulus.OutputType output = (Stimulus.OutputType)Enum.Parse(typeof(Stimulus.OutputType), stimulusItem.Attributes["output"].Value);
                        UInt64 value = Convert.ToUInt64(stimulusItem.Attributes["value"].Value);
                        string valueStr = stimulusItem.Attributes["value_str"].Value;
                        double time = Convert.ToDouble(stimulusItem.Attributes["time"].Value);
                        string timeStr = stimulusItem.Attributes["time_str"].Value;
                        double duration = Convert.ToDouble(stimulusItem.Attributes["duration"].Value);
                        string durationStr = stimulusItem.Attributes["duration_str"].Value;
                        CurrentStimuli.Add(new Stimulus(screenName, bits, output, value, valueStr, time, timeStr, duration, durationStr));
                    }
                }
                catch { }

                CurrentTriggers.Clear();
                try
                {
                    XmlNode nodeCurrentTrigger = nodeSelelectedSchematics.SelectSingleNode("current_trigger");
                    XmlNodeList triggerItems = nodeCurrentTrigger.SelectNodes("item");
                    foreach (XmlNode triggerItem in triggerItems)
                    {
                        string screenName = triggerItem.InnerText;
                        int bits = Convert.ToInt32(triggerItem.Attributes["bits"].Value);
                        Trigger.CompareCondition cond = (Trigger.CompareCondition)Enum.Parse(typeof(Trigger.CompareCondition), triggerItem.Attributes["condition"].Value);
                        UInt64 value = Convert.ToUInt64(triggerItem.Attributes["compare_value"].Value);
                        string valueStr = triggerItem.Attributes["compare_value_str"].Value;
                        Trigger.LogicOp logic = (Trigger.LogicOp)Enum.Parse(typeof(Trigger.LogicOp), triggerItem.Attributes["logic"].Value);
                        CurrentTriggers.Add(new Trigger(screenName, bits, cond, value, valueStr, logic));
                    }
                }
                catch { }
                loaded = true;
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error when loading Settings");
            }
            return loaded;
        }

        /// <summary>
        /// Saves the current contents of all public fields to the XML file using the file name passed in the constructor.
        /// </summary>
        public void SaveSettings()
        {
            try
            {
                XmlDocument doc = new XmlDocument();
                XmlDeclaration xmlDeclaration = doc.CreateXmlDeclaration("1.0", "UTF-8", null);
                XmlElement root = doc.DocumentElement;
                doc.InsertBefore(xmlDeclaration, root);

                XmlNode nodeSettings = doc.AppendChild(doc.CreateElement("settings"));
                nodeSettings.AppendChild(doc.CreateElement("identifier")).AppendChild(doc.CreateTextNode(XML_FILE_ID_STR));
                nodeSettings.AppendChild(doc.CreateElement("schematics_source")).AppendChild(doc.CreateTextNode(SchematicsSource.ToString()));
                nodeSettings.AppendChild(doc.CreateElement("schematics_name")).AppendChild(doc.CreateTextNode(SchematicsName));
                nodeSettings.AppendChild(doc.CreateElement("netlist_filename")).AppendChild(doc.CreateTextNode(NetlistFileName));
                nodeSettings.AppendChild(doc.CreateElement("simttl_filename")).AppendChild(doc.CreateTextNode(SimTTLFileName));

                XmlNode nodeKiCadFiles = nodeSettings.AppendChild(doc.CreateElement("recent_kicad_files"));
                for(int i=0; i< RecentKiCadFiles.Count; i++)
                {
                    XmlNode kicadItem = doc.CreateElement("item");
                    nodeKiCadFiles.AppendChild(kicadItem).AppendChild(doc.CreateTextNode(RecentKiCadFiles[i]));
                }

                XmlNode nodeSimTTLFiles = nodeSettings.AppendChild(doc.CreateElement("recent_simttl_files"));
                for (int i = 0; i < RecentSimTTLFiles.Count; i++)
                {
                    XmlNode simttlItem = doc.CreateElement("item");
                    nodeSimTTLFiles.AppendChild(simttlItem).AppendChild(doc.CreateTextNode(RecentSimTTLFiles[i]));
                }

                XmlNode nodePrintSettings = nodeSettings.AppendChild(doc.CreateElement("print_settings"));
                XmlNode nodePrintPaperSource = nodePrintSettings.AppendChild(doc.CreateElement("paper_source"));
                nodePrintPaperSource.AppendChild(doc.CreateElement("name")).AppendChild(doc.CreateTextNode(PrintPageSettings.PaperSource.SourceName));
                nodePrintPaperSource.AppendChild(doc.CreateElement("kind")).AppendChild(doc.CreateTextNode(PrintPageSettings.PaperSource.Kind.ToString()));
                nodePrintPaperSource.AppendChild(doc.CreateElement("raw_kind")).AppendChild(doc.CreateTextNode(PrintPageSettings.PaperSource.RawKind.ToString()));

                XmlNode nodePrintPaperSize = nodePrintSettings.AppendChild(doc.CreateElement("paper_size"));
                nodePrintPaperSize.AppendChild(doc.CreateElement("raw_kind")).AppendChild(doc.CreateTextNode(PrintPageSettings.PaperSize.RawKind.ToString()));
                nodePrintPaperSize.AppendChild(doc.CreateElement("name")).AppendChild(doc.CreateTextNode(PrintPageSettings.PaperSize.PaperName));
                nodePrintPaperSize.AppendChild(doc.CreateElement("width")).AppendChild(doc.CreateTextNode(PrintPageSettings.PaperSize.Width.ToString()));
                nodePrintPaperSize.AppendChild(doc.CreateElement("height")).AppendChild(doc.CreateTextNode(PrintPageSettings.PaperSize.Height.ToString()));

                XmlNode nodePrintMargins = nodePrintSettings.AppendChild(doc.CreateElement("margins"));
                nodePrintMargins.AppendChild(doc.CreateElement("left")).AppendChild(doc.CreateTextNode(PrintPageSettings.Margins.Left.ToString()));
                nodePrintMargins.AppendChild(doc.CreateElement("top")).AppendChild(doc.CreateTextNode(PrintPageSettings.Margins.Top.ToString()));
                nodePrintMargins.AppendChild(doc.CreateElement("right")).AppendChild(doc.CreateTextNode(PrintPageSettings.Margins.Right.ToString()));
                nodePrintMargins.AppendChild(doc.CreateElement("bottom")).AppendChild(doc.CreateTextNode(PrintPageSettings.Margins.Bottom.ToString()));

                nodePrintSettings.AppendChild(doc.CreateElement("landscape")).AppendChild(doc.CreateTextNode(PrintPageSettings.Landscape.ToString()));
                nodePrintSettings.AppendChild(doc.CreateElement("color")).AppendChild(doc.CreateTextNode(PrintPageSettings.Color.ToString()));

                doc.Save(fileName);

                SaveSchematics();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error when saving Settings");
            }
        }

        /// <summary>
        /// Save the current schematics settings.
        /// </summary>
        public void SaveSchematics()
        {
            if (SchematicsName != "")
                SaveSchematics(SchematicsFileName);
        }

        /// <summary>
        /// Save the current schematics settings.
        /// </summary>
        /// <param name="FileName">Full file name of the schematics settings file.</param>
        public void SaveSchematics(string FileName)
        {
            try
            {
                XmlDocument doc = new XmlDocument();
                XmlDeclaration xmlDeclaration = doc.CreateXmlDeclaration("1.0", "UTF-8", null);
                XmlElement root = doc.DocumentElement;
                doc.InsertBefore(xmlDeclaration, root);

                XmlNode nodeSettings = doc.AppendChild(doc.CreateElement("settings"));
                nodeSettings.AppendChild(doc.CreateElement("identifier")).AppendChild(doc.CreateTextNode(XML_FILE_ID_STR));
                nodeSettings.AppendChild(doc.CreateElement("schematics_source")).AppendChild(doc.CreateTextNode(SchematicsSource.ToString()));
                nodeSettings.AppendChild(doc.CreateElement("schematics_name")).AppendChild(doc.CreateTextNode(SchematicsName));
                nodeSettings.AppendChild(doc.CreateElement("netlist_filename")).AppendChild(doc.CreateTextNode(NetlistFileName));
                nodeSettings.AppendChild(doc.CreateElement("simttl_filename")).AppendChild(doc.CreateTextNode(SimTTLFileName));

                XmlNode nodeSchematics = nodeSettings.AppendChild(doc.CreateElement("schematics"));
                XmlNode nodeSelelectedSchematics = nodeSchematics.AppendChild(doc.CreateElement(SchematicsName));
                nodeSelelectedSchematics.AppendChild(doc.CreateElement("simulation_time_interval")).AppendChild(doc.CreateTextNode(SimulationTimeInterval.ToString()));
                nodeSelelectedSchematics.AppendChild(doc.CreateElement("simulation_max_time")).AppendChild(doc.CreateTextNode(SimulationMaxTime.ToString()));
                nodeSelelectedSchematics.AppendChild(doc.CreateElement("simulation_continue_time")).AppendChild(doc.CreateTextNode(SimulationContinueTime.ToString()));
                nodeSelelectedSchematics.AppendChild(doc.CreateElement("simulation_enable_trigger")).AppendChild(doc.CreateTextNode(EnableTrigger.ToString()));
                nodeSelelectedSchematics.AppendChild(doc.CreateElement("simulation_trigger_position")).AppendChild(doc.CreateTextNode(TriggerPosition.ToString()));
                nodeSelelectedSchematics.AppendChild(doc.CreateElement("signals_zoom_x")).AppendChild(doc.CreateTextNode(SignalsZoomX.ToString()));
                nodeSelelectedSchematics.AppendChild(doc.CreateElement("signals_graph_loc_x")).AppendChild(doc.CreateTextNode(SignalGraphsLocationX.ToString()));
                nodeSelelectedSchematics.AppendChild(doc.CreateElement("signals_graph_loc_y")).AppendChild(doc.CreateTextNode(SignalGraphsLocationY.ToString()));
                nodeSelelectedSchematics.AppendChild(doc.CreateElement("display_min_time")).AppendChild(doc.CreateTextNode(DisplayMinTime.ToString()));
                nodeSelelectedSchematics.AppendChild(doc.CreateElement("display_max_time")).AppendChild(doc.CreateTextNode(DisplayMaxTime.ToString()));
                nodeSelelectedSchematics.AppendChild(doc.CreateElement("expand_all")).AppendChild(doc.CreateTextNode(ExpandAll.ToString()));
                nodeSelelectedSchematics.AppendChild(doc.CreateElement("include_inputs")).AppendChild(doc.CreateTextNode(IncludeInputs.ToString()));
                nodeSelelectedSchematics.AppendChild(doc.CreateElement("display_pin_no")).AppendChild(doc.CreateTextNode(DisplayPinNo.ToString()));
                nodeSelelectedSchematics.AppendChild(doc.CreateElement("auto_close_import_form")).AppendChild(doc.CreateTextNode(AutoCloseImportForm.ToString()));

                XmlNode nodeCursor = nodeSelelectedSchematics.AppendChild(doc.CreateElement("cursor"));
                nodeCursor.AppendChild(doc.CreateElement("time")).AppendChild(doc.CreateTextNode(CursorMarker.Time.ToString()));
                nodeCursor.AppendChild(doc.CreateElement("x")).AppendChild(doc.CreateTextNode(CursorMarker.X.ToString()));
                nodeCursor.AppendChild(doc.CreateElement("selected")).AppendChild(doc.CreateTextNode(CursorMarker.Selected.ToString()));

                XmlNode nodeMarkers = nodeSelelectedSchematics.AppendChild(doc.CreateElement("markers"));
                foreach (Marker marker in Markers)
                {
                    XmlNode markerItem = doc.CreateElement("item");
                    nodeMarkers.AppendChild(markerItem).AppendChild(doc.CreateTextNode("marker"));
                    markerItem.Attributes.Append(doc.CreateAttribute("time")).Value = marker.Time.ToString();
                    markerItem.Attributes.Append(doc.CreateAttribute("x")).Value = marker.X.ToString();
                    markerItem.Attributes.Append(doc.CreateAttribute("selected")).Value = marker.Selected.ToString();
                }

                XmlNode nodeSelectedSignals = nodeSelelectedSchematics.AppendChild(doc.CreateElement("current_signals"));
                foreach (DisplaySignal signal in CurrentSignals)
                {
                    XmlNode signalItem = doc.CreateElement("item");
                    nodeSelectedSignals.AppendChild(signalItem).AppendChild(doc.CreateTextNode(signal.ScreenName));
                    signalItem.Attributes.Append(doc.CreateAttribute("radix")).Value = signal.Radix.ToString();
                    signalItem.Attributes.Append(doc.CreateAttribute("invert")).Value = signal.Invert.ToString();
                    signalItem.Attributes.Append(doc.CreateAttribute("reverse")).Value = signal.Reverse.ToString();
                    signalItem.Attributes.Append(doc.CreateAttribute("highlight")).Value = signal.Highlight.ToString();
                    signalItem.Attributes.Append(doc.CreateAttribute("expanded")).Value = signal.Expanded.ToString();
                }

                XmlNode nodeCurrentStimuli = nodeSelelectedSchematics.AppendChild(doc.CreateElement("current_stimuli"));
                foreach (Stimulus stimulus in CurrentStimuli)
                {
                    XmlNode stimulusItem = doc.CreateElement("item");
                    nodeCurrentStimuli.AppendChild(stimulusItem).AppendChild(doc.CreateTextNode(stimulus.SignalName));
                    stimulusItem.Attributes.Append(doc.CreateAttribute("bits")).Value = stimulus.Pins.Length.ToString();
                    stimulusItem.Attributes.Append(doc.CreateAttribute("output")).Value = stimulus.Output.ToString();
                    stimulusItem.Attributes.Append(doc.CreateAttribute("value")).Value = stimulus.Value.ToString();
                    stimulusItem.Attributes.Append(doc.CreateAttribute("value_str")).Value = stimulus.ValueStr;
                    stimulusItem.Attributes.Append(doc.CreateAttribute("time")).Value = stimulus.Time.ToString();
                    stimulusItem.Attributes.Append(doc.CreateAttribute("time_str")).Value = stimulus.TimeStr;
                    stimulusItem.Attributes.Append(doc.CreateAttribute("duration")).Value = stimulus.Duration.ToString();
                    stimulusItem.Attributes.Append(doc.CreateAttribute("duration_str")).Value = stimulus.DurationStr;
                }

                XmlNode nodeCurrentTrigger = nodeSelelectedSchematics.AppendChild(doc.CreateElement("current_trigger"));
                foreach (Trigger trigger in CurrentTriggers)
                {
                    XmlNode triggerItem = doc.CreateElement("item");
                    nodeCurrentTrigger.AppendChild(triggerItem).AppendChild(doc.CreateTextNode(trigger.SignalName));
                    triggerItem.Attributes.Append(doc.CreateAttribute("bits")).Value = trigger.Bits.ToString();
                    triggerItem.Attributes.Append(doc.CreateAttribute("condition")).Value = trigger.Condition.ToString();
                    triggerItem.Attributes.Append(doc.CreateAttribute("compare_value")).Value = trigger.CompareValue.ToString();
                    triggerItem.Attributes.Append(doc.CreateAttribute("compare_value_str")).Value = trigger.CompareValueStr;
                    triggerItem.Attributes.Append(doc.CreateAttribute("logic")).Value = trigger.Logic.ToString();
                }
                doc.Save(FileName);
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "Error when saving Settings");
            }
        }
        #endregion Public Methods

        #region Public Properties
        /// <summary>
        /// Returns true, if the file existed.
        /// </summary>
        public bool FileExisted
        {
            get { return fileExisted; }
        }

        /// <summary>
        /// Returns true, if the file could be loaded correctly.
        /// </summary>
        public bool FileLoadedCorrectly
        {
            get { return fileLoadedCorrectly; }
        }
        #endregion Public Properties



    }



}
