// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using ChipLibrary;
using SimBase;
using System;
using System.Collections.Generic;
using System.Diagnostics.Eventing.Reader;
using System.IO;
using System.Linq;
using System.Net.NetworkInformation;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

using ChipLibrary;
using static Schematics.KiCAD_Netlist;
using System.Xml.Linq;
using System.Diagnostics;

namespace Schematics
{
    /// <summary>
    /// Class definition to import a KiCAD netlist into a schematics object.
    /// </summary>
    public class KiCAD_Netlist
    {
        /// <summary>Name definition of the ChipLibray project to be used for identification of containg classes.</summary>
        private const string CHIP_LIBRARY = "ChipLibrary";
        /// <summary>Name definition of the SimBase project to be used for identification of containg classes.</summary>
        private const string SIM_BASE = "SimBase";

        /// <summary>Reference to a schematics object for the net list import.</summary>
        private BaseSchematics Schematics;

        /// <summary>
        /// Definition of the delegate for sending a string message.
        /// </summary>
        /// <param name="Level">Indent level of the message. Negative values indicate error messages</param>
        /// <param name="Msg">Message string to be sent.</param>
        public delegate void SendStringDelegate(int Level, string Msg);

        /// <summary>Event queue for the send string event.</summary>
        public SendStringDelegate SendString;
        /// <summary>A writer for the full import log.</summary>
        public StreamWriter FullLogWriter;
        /// <summary>A writer for logging the errors only of the import.</summary>
        public StreamWriter ErrorLogWriter;

        #region Level Class
        /// <summary>
        /// Definition of a class representing a level of the KiCAD netlist. 
        ///     (sheet (number "1") (name "/") (tstamps "/")
        ///         (title_block
        ///         (title "TTL 6510 Computer")
        ///         (company "Stefan Warnke")
        /// Example: first level here is named "sheet", but doesn't have a text.
        ///          next inner level is named "number" with text "1", then "name" with text "/" and then "tstanps" with text "/"
        /// </summary>
        public class Level
        {
            /// <summary>Name of this level.</summary>
            public string Name;
            /// <summary>A text in this level.</summary>
            public string Text;
            /// <summary>Reference to the owner one level up.</summary>
            public Level Owner;
            /// <summary>List of level objects underneath this object.</summary>
            public List<Level> Levels;

            /// <summary>
            /// Creates the Level instance.
            /// </summary>
            /// <param name="Owner">Reference to the owner one level up.</param>
            /// <param name="Name">Name of this level.</param>
            public Level(Level Owner, string Name)
            {
                this.Owner = Owner;
                this.Name = Name;
                Levels = new List<Level>();
            }
        }
        #endregion Level Class

        #region Component Class
        /// <summary>
        /// Definition of a class for a component in the netlist:
        /// Example:
        ///    (comp (ref "U36")
        ///      (value "74HCT574")
        ///      (footprint "Package_DIP:DIP-20_W7.62mm_Socket")
        ///      (datasheet "http://www.ti.com/lit/gpn/sn74HCT574")
        ///      (description "8-bit Register, 3-state outputs")
        ///      (fields
        ///        (field (name "OrderInfo") "https://www.digikey.com/en/products/detail/texas-instruments/CD74HCT574E/38721")
        ///        (field (name "BinaryFile"))
        ///        (field (name "Footprint") "Package_DIP:DIP-20_W7.62mm_Socket")
        ///        (field (name "Datasheet") "http://www.ti.com/lit/gpn/sn74HCT574")
        ///        (field (name "Description") "8-bit Register, 3-state outputs"))
        ///      (libsource (lib "74xx") (part "74HCT574") (description "8-bit Register, 3-state outputs"))
        ///      (property (name "OrderInfo") (value "https://www.digikey.com/en/products/detail/texas-instruments/CD74HCT574E/38721"))
        ///      (property (name "BinaryFile") (value ""))
        ///      (property (name "Sheetname") (value "Micro Code Sequencer"))
        ///      (property (name "Sheetfile") (value "Micro_Code_Sequencer.kicad_sch"))
        ///      (property (name "ki_keywords") (value "TTL REG DFF DFF8 3State"))
        ///      (property (name "ki_fp_filters") (value "DIP?20*"))
        ///      (sheetpath (names "/Micro Code Sequencer/") (tstamps "/41302e21-3d61-43b2-ae5a-597d1005b54a/"))
        ///      (tstamps "e591c8da-a267-4b52-b274-ba0ad785a18e"))
        /// </summary>
        public class Comp
        {
            /// <summary>Reference designator from the netlist</summary>
            public string Ref;
            /// <summary>Name of the component.</summary>
            public string Name;
            /// <summary>Reference to the top level object of this component.</summary>
            public Level Level;
            /// <summary>Reference to the created element in the schematics.</summary>
            public BaseElement BaseElement;
            /// <summary>The file name of the binary file to be loaded.</summary>
            public string BinaryFile;

            /// <summary>
            /// Creates the Comp instance.
            /// </summary>
            /// <param name="Ref">Reference designator from the netlist</param>
            /// <param name="Name">Name of the component.</param>
            /// <param name="Level">Reference to the top level object of this component.</param>
            public Comp(string Ref, string Name, Level Level)
            {
                this.Ref = Ref;
                this.Name = Name;
                this.Level = Level;
            }
        }
        #endregion Component Class

        #region Node Class
        /// <summary>
        /// Definition of a class for a netlist node.
        /// Example:
        ///   (nets
        ///       (net (code "1") (name "/ALU/ALU0") (class "Default")
        ///       (node (ref "J15") (pin "2") (pinfunction "Pin_2") (pintype "passive"))
        ///       (node (ref "U64") (pin "9") (pinfunction "F0") (pintype "output"))
        ///       (node (ref "U67") (pin "2") (pinfunction "A0") (pintype "input")))
        /// </summary>
        public class Node
        {
            /// <summary>Reference designator from the netlist</summary>
            public string Ref;
            /// <summary>Name of the pin from the netlist</summary>
            public string PinName;
            /// <summary>Pin function from the netlist</summary>
            public string PinFunction;
            /// <summary>Pintype from the netlist</summary>
            public string PinType;
            /// <summary>Reference to the top level object of this component.</summary>
            public Level Level;

            /// <summary>
            /// Creates the Node instance.
            /// </summary>
            /// <param name="Ref">Reference designator from the netlist</param>
            /// <param name="PinName">Name of the pin from the netlist</param>
            /// <param name="PinFunction">Pin function from the netlist</param>
            /// <param name="PinType">Pintype from the netlist</param>
            /// <param name="Level">Reference to the top level object of this component.</param>
            public Node(string Ref, string PinName, string PinFunction, string PinType, Level Level)
            {
                this.Ref = Ref;
                this.PinName = PinName;
                this.PinFunction = PinFunction;
                this.PinType = PinType;
                this.Level = Level;
            }   

            /// <summary>
            /// Gets the pin name.
            /// </summary>
            public string PinNo
            {
                get { return PinName; }
            }

            /// <summary>
            /// Is true, when the pintype is an input.
            /// </summary>
            public bool IsInput
            {
                get { return PinType == "input"; }
            }

            /// <summary>
            /// Is true, when the pintype is an output.
            /// </summary>
            public bool IsOutput
            {
                get { return PinType == "output"; }
            }

            /// <summary>
            /// Is true, when the pintype is an trie_state.
            /// </summary>
            public bool IsTriState
            {
                get { return PinType == "tri_state"; }
            }


            /// <summary>
            /// Is true, when the pintype is an open_drain.
            /// </summary>
            public bool IsOpenDrain
            {
                get { return PinType == "open_drain"; }
            }

            /// <summary>
            /// Is true, when the pintype is an passive.
            /// </summary>
            public bool IsPassive
            {
                get { return PinType == "passive"; }
            }

            /// <summary>
            /// Is true, when the pintype is an power_in.
            /// </summary>
            public bool IsPowerIn
            {
                get { return PinType == "power_in"; }
            }
        }
        #endregion Node Class

        #region NetListNet Class
        /// <summary>
        /// Class definition of a net as definied in the netlist from the schematics in contrast to the net class used in the internal schematics.
        /// Example:
        ///   (nets
        ///       (net (code "1") (name "/ALU/ALU0") (class "Default")
        ///       (node (ref "J15") (pin "2") (pinfunction "Pin_2") (pintype "passive"))
        ///       (node (ref "U64") (pin "9") (pinfunction "F0") (pintype "output"))
        ///       (node (ref "U67") (pin "2") (pinfunction "A0") (pintype "input")))
        /// </summary>
        public class NetListNet
        {
            /// <summary>Code field string.</summary>
            public string Code;
            /// <summary>Name of the net without sheet info, if any.</summary>
            public string Name;
            /// <summary>Name of the net including sheet info, if any.</summary>
            public string FullName;
            /// <summary>Reference to the level object of this net.</summary>
            public Level Level;
            /// <summary>List of all nodes for this net.</summary>
            public List<Node> Nodes;
            /// <summary>Reference to a bus object, if exists.</summary>
            public NetListBus NetListBus;
            /// <summary>Index of this net in the bus object, if applicable</summary>
            public int BusIdx;

            /// <summary>
            /// Creates the instance of this class.
            /// </summary>
            /// <param name="Code">Code field string</param>
            /// <param name="NetName">Name of the net including sheet info, if any.</param>
            /// <param name="Level">Reference to the level object of this net.</param>
            public NetListNet(string Code, string NetName, Level Level)
            {
                this.Code = Code;
                SetName(NetName);
                this.Level = Level;
                this.Nodes = new List<Node>();
                this.NetListBus = null;
                this.BusIdx = -1;
            }

            /// <summary>
            /// Sets the Name field by splitting off a sheet name, if any and the FullName. 
            /// </summary>
            /// <param name="NetName">Name of the net including sheet info, if any.</param>
            public void SetName(string NetName)
            {
                int idx = NetName.LastIndexOf('/');
                if (idx >= 0)
                    this.Name = NetName.Substring(idx+1).Replace("{slash}", "/"); 
                else
                    this.Name = NetName.Replace("{slash}", "/");

                this.FullName = NetName.Replace('/','.').Replace("{slash}","/");
            }

            /// <summary>
            /// True, if the net is labeled with a special name.
            /// </summary>
            public bool IsLabeled
            {
                get { return (IsUnlabeled == false) && (IsUnconnected == false); }
            }

            /// <summary>
            /// True, if the net has auto-generated name.
            /// </summary>
            public bool IsUnlabeled
            {
                get { return this.Name.StartsWith("Net-("); }
            }

            /// <summary>
            /// True, if the net had been marked as unconnected.
            /// </summary>
            public bool IsUnconnected
            {
                get { return this.Name.StartsWith("unconnected"); }
            }

            /// <summary>
            /// Gets a list of all nodes that are inputs.
            /// </summary>
            public List<Node> InputNodes
            {
                get 
                {
                    List<Node> result = new List<Node>();
                    foreach (Node node in Nodes) 
                        if (node.IsInput) 
                            result.Add(node);
                    return result; 
                }
            }

            /// <summary>
            /// Gets a list of all nodes that are outputs.
            /// </summary>
            public List<Node> OutputNodes
            {
                get
                {
                    List<Node> result = new List<Node>();
                    foreach (Node node in Nodes)
                        if (node.IsOutput)
                            result.Add(node);
                    return result;
                }
            }

            /// <summary>
            /// Gets a list of all nodes that are tri states.
            /// </summary>
            public List<Node> TriStateNodes
            {
                get
                {
                    List<Node> result = new List<Node>();
                    foreach (Node node in Nodes)
                        if (node.IsTriState)
                            result.Add(node);
                    return result;
                }
            }

            /// <summary>
            /// Gets a list of all nodes that are open drains.
            /// </summary>
            public List<Node> OpenDrainNodes
            {
                get
                {
                    List<Node> result = new List<Node>();
                    foreach (Node node in Nodes)
                        if (node.IsOpenDrain)
                            result.Add(node);
                    return result;
                }
            }

            /// <summary>
            /// Gets a list of all nodes that are passives.
            /// </summary>
            public List<Node> PassiveNodes
            {
                get
                {
                    List<Node> result = new List<Node>();
                    foreach (Node node in Nodes)
                        if (node.IsPassive)
                            result.Add(node);
                    return result;
                }
            }

            /// <summary>
            /// Gets a list of all nodes that are power inputs.
            /// </summary>
            public List<Node> PowerInNodes
            {
                get
                {
                    List<Node> result = new List<Node>();
                    foreach (Node node in Nodes)
                        if (node.IsPowerIn)
                            result.Add(node);
                    return result;
                }
            }


        }
        #endregion NetListNet Class

        #region NetListBus Class
        /// <summary>
        /// Class definition for group of nets that form a bus through their indexing in the names.
        /// </summary>
        public class NetListBus
        {
            /// <summary>Name of the bus.</summary>
            public string Name;
            /// <summary>List of nets belonging to this bus.</summary>
            public List<NetListNet> Nets;

            /// <summary>
            /// Creates the instance of the bus class.
            /// </summary>
            /// <param name="Name">Name of the bus.</param>
            /// <param name="Net">Initial net to be added to the Nts list.</param>
            public NetListBus(string Name, NetListNet Net)
            {
                this.Name = Name;
                Nets = new List<NetListNet>();
                Nets.Add(Net);
            }
        }
        #endregion NetListBus Class

        /// <summary>Root level object holding all levels underneath.</summary>
        private Level Levels;
        /// <summary>List of all components.</summary>
        private List<Comp> Comps;
        /// <summary>List of all nets.</summary>
        private List<NetListNet> Nets;
        /// <summary>List of all buses.</summary>
        private List<NetListBus> Buses;
        /// <summary>Directory of the netlist import, where also other files can be found.</summary>
        private string NetListDir;

        /// <summary>
        /// Creates the instance of the KiCAD_Netlist import class.
        /// </summary>
        /// <param name="Schematics">Reference to the schematics object for the import.</param>
        public KiCAD_Netlist(BaseSchematics Schematics)
        {
            this.Schematics = Schematics;
            this.FullLogWriter = null;
            this.ErrorLogWriter = null;
            this.Levels = new Level(null, "ROOT");
            this.Comps = new List<Comp>();
            this.Nets = new List<NetListNet>();
            this.Buses = new List<NetListBus>();
        }

        #region Private Methods
        /// <summary>
        /// Log a message to file and notify registered event handlers.
        /// </summary>
        /// <param name="Level">Indent level of the message. Negative values indicate error messages</param>
        /// <param name="Msg">Message string to be logged</param>
        private void Log(int Level, string Msg)
        {
            if (Level > 0)
                Msg = "".PadLeft(2 * Level, ' ') + Msg;

            if (FullLogWriter != null)
                FullLogWriter.WriteLine(Msg);

            if ((Level<0) && (ErrorLogWriter != null))
                ErrorLogWriter.WriteLine(Msg);

            if (SendString != null)
                SendString(Level, Msg);
        }

        /// <summary>
        /// Find a level object under the CurrentLevel with a matching Name.
        /// </summary>
        /// <param name="CurrentLevel">Level to search the Levels list for the Name.</param>
        /// <param name="Name">Name to to look for.</param>
        /// <returns>Reference to the sub level with a matching name or null if not found.</returns>
        private Level FindLevel(Level CurrentLevel, string Name)
        {
            foreach (Level level in CurrentLevel.Levels)
            {
                if (level.Name == Name) return level;
            }
            foreach (Level level in CurrentLevel.Levels)
            {
                Level found = FindLevel(level, Name);
                if (found != null) return found;
            }
            return null;
        }

        /// <summary>
        /// Find a level object under the CurrentLevel with a matching Name and then match the sublevel in name and text.
        /// </summary>
        /// <param name="CurrentLevel">Level to search the Levels list for the Name.</param>
        /// <param name="Name">Name to to look for.</param>
        /// <param name="SubLevelName">A sub level name that has to exist.</param>
        /// <param name="SubLevelText">A sub level text that has to exist.</param>
        /// <returns>Reference to the sub level with a matching name and sub level or null if not found.</returns>
        private Level FindLevel(Level CurrentLevel, string Name, string SubLevelName, string SubLevelText)
        {
            foreach (Level level in CurrentLevel.Levels)
            {
                if (level.Name == Name)
                {
                    Level level1 = FindLevel(level, SubLevelName);
                    if ((level1 != null) && (level1.Text == SubLevelText))
                        return level;
                }
            }
            //foreach (Level level in CurrentLevel.Levels)
            //{
            //    Level found = FindLevel(level, Name);
            //    if (found != null) return found;
            //}
            return null;
        }

        /// <summary>
        /// Find the assembly with a matching name.
        /// </summary>
        /// <param name="AssemblyName">Name of the assembly to find.</param>
        /// <returns>Reference to the found assembly or null.</returns>
        private Assembly GetAssembly(string AssemblyName)
        {
            Assembly[] assemblies = AppDomain.CurrentDomain.GetAssemblies();
            foreach (Assembly assy in assemblies)
            {
                string[] s = assy.FullName.Split(new char[] { ',' });
                if (s[0] == AssemblyName)
                    return assy;
            }
            return null;
        }

        /// <summary>
        /// Get the type of the type matching the TypeName from the assembly defined by AssemblyName.
        /// </summary>
        /// <param name="AssemblyName">Name of the assembly to search for the type</param>
        /// <param name="TypeName">Name of the class type to look for.</param>
        /// <returns>Type of the matching class or null if not found.</returns>
        private Type FindTypeInLibrary(string AssemblyName, string TypeName)
        {
            Assembly assembly = GetAssembly(AssemblyName);
            Type type = assembly.GetType(AssemblyName + "." + TypeName);
            if (type != null)
                return type;

            foreach (Type t in assembly.ExportedTypes)
            {
                if (TypeName.Contains(t.Name))
                    return t;
            }

            return null;
        }

        /// <summary>Logic family names to be mapped to the available chips.</summary>
        private string[] LogicFamilies = { "ACTQ", "AHCT", "ACT", "ALS", "AS", "C", "F", "HCT", "HC", "LS", "S" };

        /// <summary>
        /// Get the type of the name in the ChipLibrary or a mapped family.
        /// </summary>
        /// <param name="Name">Name of the chip to be found.</param>
        /// <returns>Type of the matching class or null if not found.</returns>
        private Type FindType(string Name)
        {
            bool logicSeries = false;
            string name = Name;
            if (Name.StartsWith("CD74") || Name.StartsWith("SN74") || Name.StartsWith("SN54"))
            {
                name = name.Substring(4);
                logicSeries = true;
            }
            else if (Name.StartsWith("74"))
            {
                name = name.Substring(2);
                logicSeries = true;
            }

            Type type = FindTypeInLibrary(CHIP_LIBRARY, name);
            if (type != null) return type;

            if (logicSeries)
            {
                for (int i = 0; i < LogicFamilies.Length; i++)
                {
                    if (name.StartsWith(LogicFamilies[i]))
                    {
                        type = FindTypeInLibrary(CHIP_LIBRARY, name.Replace(LogicFamilies[i], "HCT"));
                        if (type != null) return type;
                    }
                }
            }
            return null;
        }

        /// <summary>
        /// Add the new net to the Nets list and check for indices indicating a bus member and also add to bus lists if possible.
        /// </summary>
        /// <param name="NewNet">New net to be added.</param>
        private void NetAdd(NetListNet NewNet)
        {
            string name = NewNet.Name;
            string s = "";
            while ((name.Length > 0) && (name[name.Length - 1] >='0') && (name[name.Length - 1] <= '9'))
            {
                s = s.Insert(0, name.Substring(name.Length-1) );
                name = name.Substring(0, name.Length - 1);
            }

            if (s.Length>0)
            {
                NewNet.BusIdx = Convert.ToInt32(s);
                bool found = false;

                foreach(NetListBus b in Buses)
                {
                    if (b.Name == name)
                    {
                        b.Nets.Add(NewNet);
                        NewNet.NetListBus = b;
                        b.Nets.Sort((x, y) => x.BusIdx.CompareTo(y.BusIdx));
                        found = true; break;
                    }
                }

                if (found == false)
                {
                    NetListBus bus = new NetListBus(name, NewNet);
                    NewNet.NetListBus = bus;
                    Buses.Add(bus);
                }
            }
            Nets.Add(NewNet);
        }

        /// <summary>
        /// Get the value of a passive component as base unit. 
        /// </summary>
        /// <param name="ValueStr">String to be converted.</param>
        /// <returns>Base unit value.</returns>
        private double GetPassiveValue(string ValueStr)
        {
            double result = 0;
            string svalue = ValueStr.Split(new char[] { '/', ' ' })[0];
            string s = "";
            while ((svalue != "") && (svalue[svalue.Length-1] >='9'))
            {
                s = s.Insert(0,svalue.Substring(svalue.Length - 1));
                svalue = svalue.Substring(0,svalue.Length - 1);
            }
            try
            {
                result = Convert.ToDouble(svalue);
                switch (s[0])
                {
                    case 'p':
                        result /= 1e12;
                        break;

                    case 'n':
                        result /= 1e9;
                        break;

                    case 'u':
                        result /= 1e6;
                        break;

                    case 'm':
                        result /= 1e3;
                        break;

                    case 'k':
                        result *= 1e3;
                        break;

                    case 'M':
                        result *= 1e6;
                        break;

                    case 'G':
                        result *= 1e9;
                        break;

                    case 'T':
                        result *= 1e12;
                        break;
                }
            }
            catch { }
            return result;
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="Pin"></param>
        /// <param name="LogicPin"></param>
        private void SetLogic(Pin Pin, Pin LogicPin)
        {
            //foreach (Pin pin in Pin.ConnectedPins)
            //    if (pin.Mode == LineMode.Out)
            //        return;
            //Pin.ConnectedPins.Add(LogicPin);
        }

        private void SetLogic(Pin[] Pins, Pin LogicPin)
        {
            foreach (Pin pin in Pins)
                SetLogic(pin, LogicPin);
        }
        #endregion Private Methods

        #region Public Methods
        /// <summary>
        /// Write current contents read from the netlist to a log file.
        /// </summary>
        /// <param name="LogFileName">Full file name of the log file to write to.</param>
        public void LogNetList(string LogFileName)
        {
            StreamWriter sw = new StreamWriter(LogFileName);
            Level componentsLevel = FindLevel(this.Levels, "components");
            foreach (Level compLevel in componentsLevel.Levels)
            {
                if (compLevel.Name == "comp")
                {
                    Level refLevel = FindLevel(compLevel, "ref");
                    Level valLevel = FindLevel(compLevel, "value");
                    string sref = refLevel == null ? "?" : refLevel.Text;
                    string svalue = valLevel == null ? "?" : valLevel.Text;
                    sw.WriteLine("comp: " + sref + ":" + svalue);
                }
            }

            Level netsLevel = FindLevel(this.Levels, "nets");
            foreach (Level netLevel in netsLevel.Levels)
            {
                if (netLevel.Name == "net")
                {
                    Level codeLevel = FindLevel(netLevel, "code");
                    Level nameLevel = FindLevel(netLevel, "name");
                    string scode = codeLevel == null ? "?" : codeLevel.Text;
                    string sname = nameLevel == null ? "?" : nameLevel.Text;
                    string ss = "";
                    foreach (Level level in netLevel.Levels)
                    {
                        if (level.Name == "node")
                        {
                            for (int i = 0; i < level.Levels.Count; i++)
                            {
                                if (level.Levels[i].Name == "ref")
                                    ss += level.Levels[i].Text + ":";
                                else if (level.Levels[i].Name == "pin")
                                    ss += "#" + level.Levels[i].Text + ",";
                            }
                        }
                    }
                    sw.WriteLine("code=" + scode + " name=" + sname + " " + ss);
                }
            }
            sw.Close();
        }


        /// <summary>
        /// Extract the disassembler file name from the netlist and load it to schematics object.
        /// </summary>
        private void GetDisassemblerFile()
        {
            Level designLevel = FindLevel(this.Levels, "design");
            if (designLevel != null)
            {
                foreach (Level desLevel in designLevel.Levels)
                {
                    if (desLevel.Name == "sheet")
                    {
                        Level titleLevel = FindLevel(desLevel, "title_block");
                        if (titleLevel != null)
                        {
                            foreach (Level level in titleLevel.Levels)
                            {
                                Level numberLevel = FindLevel(level, "number");
                                if ((numberLevel != null) && (numberLevel.Text == "9"))
                                {
                                    Level valueLevel = FindLevel(level, "value");
                                    if (valueLevel != null)
                                    {
                                        string DisassemblerFileName = NetListDir + "\\" + valueLevel.Text;
                                        if (File.Exists(DisassemblerFileName))
                                        {
                                            Schematics.Disassembler.LoadFile(DisassemblerFileName);
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        /// <summary>
        /// Create the schematics contents from the netlist objects after reading the netlist.
        /// </summary>
        /// <param name="FullLogFileName">File name of the full log file.</param>
        /// <param name="ErrorLogFileName">File name of the error log file.</param>
        public void CreateSchematics(string FullLogFileName, string ErrorLogFileName)
        {

            HCT00 test = new HCT00(""); // forces application to load the ChipLibrary
            Schematics.Elements.Clear();
            FullLogWriter = new StreamWriter(FullLogFileName);
            ErrorLogWriter = new StreamWriter(ErrorLogFileName);

            List<Crystal> crystals = new List<Crystal>();

            GetDisassemblerFile();
            Log(0, "Loading components");
            Level componentsLevel = FindLevel(this.Levels, "components");

            foreach (Level compLevel in componentsLevel.Levels)
            {
                if (compLevel.Name == "comp")
                {
                    Level refLevel = FindLevel(compLevel, "ref");
                    Level valLevel = FindLevel(compLevel, "value");
                    Level descrLevel = FindLevel(compLevel, "description");
                    string sref = refLevel == null ? "?" : refLevel.Text;
                    string svalue = valLevel == null ? "?" : valLevel.Text;
                    string sdescr = descrLevel == null ? "?" : descrLevel.Text;

                    Type type = null;
                    int RN_N = 0;
                    Char ch = sref[0];
                    switch (ch)
                    {
                        case 'C':
                            type = FindTypeInLibrary(SIM_BASE, "Capacitor");
                            break;

                        case 'D':
                            type = FindTypeInLibrary(SIM_BASE, "Diode");
                            break;

                        case 'J':
                            if (sref[1] == 'P')
                            {
                                if (sdescr.Contains("2-pole"))
                                    type = FindTypeInLibrary(SIM_BASE, "Jumper2");
                                else if (sdescr.Contains("3-pole"))
                                    type = FindTypeInLibrary(SIM_BASE, "Jumper3");
                            }
                            break;

                        case 'L':
                            type = FindTypeInLibrary(SIM_BASE, "Inductor");
                            break;

                        case 'R':
                            if (sref.StartsWith("RN"))
                            {
                                type = FindTypeInLibrary(SIM_BASE, "ResistorNetwork");
                                int idx = sdescr.IndexOf("resistor network");
                                if (idx > 0)
                                {
                                    try { RN_N = Convert.ToInt32(sdescr.Substring(0, idx).Trim()); } catch { }
                                }
                            }
                            else if (sref.StartsWith("RV"))
                                type = FindTypeInLibrary(SIM_BASE, "Potentiometer");
                            else
                                type = FindTypeInLibrary(SIM_BASE, "Resistor");
                            break;

                        case 'S':
                            if (sref[1] == 'W')
                                type = FindTypeInLibrary(SIM_BASE, "Switch");
                            break;

                        case 'Y':
                            type = FindTypeInLibrary(SIM_BASE, "Crystal");
                            break;

                        default:
                            type = FindType(svalue);
                            break;
                    }

                    Comp comp = new Comp(sref, svalue, compLevel);
                    Comps.Add(comp);

                    Log(1, "comp " + sref + " " + svalue);

                    if (type != null)
                    {
                        object obj = Activator.CreateInstance(type, new object[] { sref });
                        if ((obj != null) && (obj is BaseElement))
                        {
                            comp.BaseElement = (BaseElement)obj;
                            Schematics.Elements.Add((BaseElement)obj);
                            if (obj is Passive2Pin)
                            {
                                Passive2Pin pp = ((Passive2Pin)obj);
                                pp.Value = GetPassiveValue(svalue);
                                pp.ValueStr = svalue;
                                if (pp is Crystal)
                                    crystals.Add((Crystal)pp);
                            }
                            else if (obj is Potentiometer)
                            {
                                Potentiometer pot = ((Potentiometer)obj);
                                pot.Value = GetPassiveValue(svalue);
                                pot.ValueStr = svalue;
                            }
                            else if (obj is ResistorNetwork)
                            {
                                ResistorNetwork rn = ((ResistorNetwork)obj);
                                rn.N = RN_N;
                                string[] ss = svalue.Split(new char[] { 'x', 'X', '*' });
                                if (ss.Length == 2)
                                    svalue = ss[1].Trim();
                                rn.Value = GetPassiveValue(svalue);
                                rn.ValueStr = svalue;
                            }
                            else if (obj is Jumper2)
                            {
                                Jumper2 jp2 = ((Jumper2)obj);
                                jp2.Bridged = sdescr.Contains("closed");
                            }
                            else if (obj is Jumper3)
                            {
                                Jumper3 jp3 = ((Jumper3)obj);
                                if (sdescr.Contains("pins 1+2 closed"))
                                    jp3.Bridged = Jumper3.BridgeType.Bridge12;
                                else if (sdescr.Contains("pins 2+3 closed"))
                                    jp3.Bridged = Jumper3.BridgeType.Bridge23;
                            }
                            else
                            {
                                Level fieldsLevel = FindLevel(compLevel, "fields");
                                if (fieldsLevel != null)
                                {
                                    Level fieldLevel = FindLevel(fieldsLevel, "field", "name", "BinaryFile");
                                    if ((fieldLevel != null) && (fieldLevel.Text != null))
                                    {
                                        comp.BinaryFile = fieldLevel.Text;
                                        if (comp.BaseElement is ILoadable)
                                        {
                                            string fname = NetListDir + comp.BinaryFile;
                                            if (!File.Exists(fname))
                                                fname = Application.StartupPath +"\\"+ comp.BinaryFile;

                                            try { (comp.BaseElement as ILoadable).LoadContents(fname); }
                                            catch (Exception e) { Log(-1, comp.Ref + " " + comp.Name +": " + e.Message ); }
                                        }
                                    }
                                }
                            }
                         }
                        else
                            Log(-1, "! Failed to create " + svalue + " " + sref + ";");
                    }
                    else
                        Log(-1, "! Type " + svalue + " is missing!");

                }
            }


            Log(0, "Loading nets");
            Level netsLevel = FindLevel(this.Levels, "nets");
            foreach (Level netLevel in netsLevel.Levels)
            {
                if (netLevel.Name == "net")
                {
                    Level codeLevel = FindLevel(netLevel, "code");
                    Level nameLevel = FindLevel(netLevel, "name");
                    if ((codeLevel != null) && (nameLevel != null))
                    {
                        string scode = codeLevel.Text;
                        string sname = nameLevel.Text;

                        NetListNet currentNet = new NetListNet(scode, sname, netLevel);
                        NetAdd(currentNet);
                        Log(1, "net code=" + scode + " name=" + currentNet.Name);

                        foreach (Level level in netLevel.Levels)
                        {
                            if (level.Name == "node")
                            {
                                Level typeLevel = FindLevel(level, "pintype");
                                Level refLevel = FindLevel(level, "ref");
                                Level pinLevel = FindLevel(level, "pin");

                                if ((typeLevel != null) && (refLevel != null) && (pinLevel != null))
                                {
                                    string sref = refLevel.Text;
                                    string spin = pinLevel.Text;
                                    Level pinFuncLevel = FindLevel(level, "pinfunction");
                                    string spinFunc = (pinFuncLevel != null) ? pinFuncLevel.Text : "";
                                    string stype = typeLevel.Text;
                                    Node node = new Node(sref, spin, spinFunc, stype, level);
                                    currentNet.Nodes.Add(node);

                                    Log(2, "node ref=" + sref + " pin=" + spin + " type=" + stype + " spinFunc=" + spinFunc);
                                }
                            }
                        }
                    }
                }
            }

            Log(0, "Creating Buses");
            foreach (NetListBus bus in Buses)
            {
                if (bus.Nets.Count > 1)
                {
                    SignalBus sb = new SignalBus(bus.Name, bus.Nets.Count);

                    for (int i = 0; i < bus.Nets.Count; i++)
                    {
                        foreach (Node node in bus.Nets[i].Nodes)
                        {
                            BaseElement be = Schematics.GetElement(node.Ref);
                            if (be != null)
                            {
                                Pin pin = be.GetPin(node.PinNo);
                                if (pin != null)
                                {
                                    sb[i].ConnectedPins.Add(pin);
                                    pin.ConnectedNet = sb[i];
                                }
                                else
                                    Log(-2, "NetListBus=" + bus.Name + "  Net=" + bus.Nets[i].Name + "  Ref=" + node.Ref + "  Pin=" + node.PinNo.ToString() + "  not found!");
                            }
                            else Log(-2, "NetListBus=" + bus.Name + "  Net=" + bus.Nets[i].Name + "  Ref=" + node.Ref + "  not found!");
                        }
                    }
                    Schematics.Elements.Add(sb);
                    Log(2, "NetListBus=" + bus.Name + "  Width=" + bus.Nets.Count);


                    if ((bus.Name == "IR") && Schematics.Disassembler.HasCodes)
                    {
                        Net[] net = new Net[bus.Nets.Count];
                        for (int i = 0; i < bus.Nets.Count; i++)
                            net[i] = sb[i];

                        CustomBus cb = new CustomBus("Mnemonic", net);
                        Schematics.Elements.Add(cb);
                        cb.CustomConvHandler += Schematics.Disassembler.Disassembly;
                    }
                }
                else if (bus.Nets.Count == 1)
                {
                    bus.Nets[0].NetListBus = null;
                }
            }

            Log(0, "Connecting Pins");
            foreach (NetListNet schNet in Nets)
            {
                if ((schNet.NetListBus == null) && (schNet.IsUnconnected == false))
                {
                    Net simbaseNet = new Net(schNet.Name);

                    foreach (Node node in schNet.Nodes)
                    {
                        BaseElement be = Schematics.GetElement(node.Ref);
                        if (be != null)
                        {
                            Pin pin = be.GetPin(node.PinNo);
                            if (pin != null)
                                simbaseNet.ConnectedPins.Add(pin);
                            else
                                Log(-2, "Net=" + schNet.Name + "  Ref=" + node.Ref + "  Pin=" + node.PinNo.ToString() + "  not found!");
                        }
                        else Log(-2, "Net=" + schNet.Name + "  Ref=" + node.Ref + "  not found!");
                    }

                    if (schNet.IsLabeled)
                        Schematics.Elements.Add(new SignalLabel(schNet.Name, simbaseNet));

                    string s = schNet.Name.ToUpper();
                    if (Net.IsGroundOrLogicLow(s))
                        simbaseNet.ConnectedPins.Add(Schematics.LogicLevel.L);

                    if (Net.IsPowerOrLogicHigh(s))
                        simbaseNet.ConnectedPins.Add(Schematics.LogicLevel.H);

                    //foreach (Pin pin in pins)
                    //{
                    //    foreach (Pin p in pins)
                    //        if (pin != p)
                    //            pin.ConnectedPins.Add(p);

                    //    pin.ConnectedNet = schNet.Name;
                    //}
                }
            }


            Log(0, "Checking Passives");
            foreach (Comp comp in Comps)
            {
                if (comp.BaseElement != null)
                    foreach (Pin pin in comp.BaseElement.Passive)
                    {
                        if ((pin.ConnectedNet != null) && Net.IsGroundOrLogicLow(pin.ConnectedNet.Name))
                        {
                            pin.SetOutState(SignalState.L);
                            //if (comp.BaseElement is ResistorNetwork)
                        }
                        else if ((pin.ConnectedNet != null) && Net.IsPowerOrLogicHigh(pin.ConnectedNet.Name))
                        {
                            pin.SetOutState(SignalState.H);
                            //if (comp.BaseElement is ResistorNetwork) 
                        }
                    }
            } 


            Log(0, "Checking for Crystals");
            for (int i=0; i< crystals.Count; i++)
            {
                double ns = 1e9 / crystals[i].Value/2;
                ClockGenerator cg = new ClockGenerator("ClkGen" + i.ToString(), SignalState.L, ns, 0);
                Schematics.Elements.Add(cg);
                for (int j = 0; j < crystals[i].Passive.Count(); j++)
                {
                    foreach (Pin pin in crystals[i].Passive[j].ConnectedNet.ConnectedPins)
                        if (pin.Mode == LineMode.In)
                        {
                            pin.ConnectedNet.ConnectedPins.Add(cg.Out);
                            Log(-2, "Clock Generator " + cg.Name + " " + ns.ToString("F1") + "ns  added to " + pin.Owner.Name + "  Pin=" + pin.PinNo.ToString());
                            break;
                        }
                }
            }

            Log(0, "Checking for RCs");
            List<Pin> outPins = new List<Pin>();
            foreach (Comp comp in Comps)
            {
                if ((comp.BaseElement != null) && (comp.BaseElement is Resistor))
                {
                    Resistor r1 = (Resistor)comp.BaseElement;
                    for (int i = 0; i < r1.Passive.Length; i++)
                    {
                        //if ((IsGroundOrLogicLow(r1.Passive[i].ConnectedNet) == false) && (IsPowerOrLogicHigh(r1.Passive[i].ConnectedNet) == false))
                        {
                            Pin inPinAtC = null;
                            Capacitor c = null;
                            Resistor r2 = null;
                            Pin r2Cpin = null;
                            Diode d1 = null;
                            Diode d2 = null;

                            if (r1.Passive[i].ConnectedNet != null)
                                foreach (Pin pin in r1.Passive[i].ConnectedNet.ConnectedPins)
                                {
                                    if (pin.Mode == LineMode.In)
                                        inPinAtC = pin;
                                    else if (pin.Mode == LineMode.Passive)
                                    {
                                        if (pin.Owner is Capacitor)
                                        {
                                            if (Net.IsGroundOrLogicLow(((Capacitor)pin.Owner).OtherPin(pin).ConnectedNet.Name))
                                                c = (Capacitor)pin.Owner;
                                        }
                                        else if ((pin.Owner is Resistor) && (pin.Owner != r1))
                                        {
                                            r2 = (Resistor)pin.Owner;
                                            r2Cpin = pin;
                                        }
                                    }
                                }

                            if ((inPinAtC != null) && (c != null))
                            {
                                Pin outPinAtC = null;
                                foreach (Pin pin in inPinAtC.ConnectedNet.ConnectedPins)
                                    if (pin.Mode == LineMode.Out)
                                        outPinAtC = pin;

                                if ((outPinAtC == null) && (outPins.IndexOf(inPinAtC) <0))
                                {
                                    outPins.Add(inPinAtC);
                                    Resistor r_pullup = r1;

                                    if (r2 == null)
                                    {
                                        RC_LP lp = new RC_LP("LP" + outPins.Count.ToString(), r1.OtherPin(r1.Passive[i]).ConnectedNet, r1.Value, r1.Value, c.Value);
                                        Schematics.Elements.Add(lp);
                                        inPinAtC.ConnectedNet.ConnectedPins.Add(lp.Out);
                                        Log(-2, "Low Pass " + lp.Name + "  R=" + r1.ValueStr + "/C=" + c.ValueStr + "  added to " + inPinAtC.Owner.Name + "  Pin=" + inPinAtC.PinNo.ToString());
                                    }
                                    else
                                    {
                                        Pin r1in = r1.OtherPin(inPinAtC);
                                        Pin r1inDrivingPin = null;
                                        Pin d1inPin = null;
                                        if (r1in.ConnectedNet != null)
                                            foreach (Pin pin in r1in.ConnectedNet.ConnectedPins)
                                            {
                                                if (pin.Mode == LineMode.Out)
                                                    r1inDrivingPin = pin;
                                                else if (pin.Owner is Diode)
                                                {
                                                    d1 = (Diode)pin.Owner;
                                                    d1inPin = d1.OtherPin(pin);
                                                }
                                            }

                                        Pin r2in = r2.OtherPin(r2Cpin);
                                        Pin r2inDrivingPin = null;
                                        Pin d2inPin = null;
                                        if (r2in.ConnectedNet != null)
                                            foreach (Pin pin in r2in.ConnectedNet.ConnectedPins)
                                            {
                                                if (pin.Mode == LineMode.Out)
                                                    r2inDrivingPin = pin;
                                                else if (pin.Owner is Diode)
                                                {
                                                    d2 = (Diode)pin.Owner;
                                                    d2inPin = d2.OtherPin(pin);
                                                }
                                            }

                                        double rLvalue = -1, rHvalue = -1;
                                        Net drivingNet = null;
                                        if ((r1inDrivingPin != null) && (d2inPin != null) && (r1inDrivingPin.ConnectedNet == d2inPin.ConnectedNet))
                                        {
                                            if (d2inPin.Name == "K")
                                            {
                                                rLvalue = 1 / ((1 / r1.Value) + (1 / r2.Value));
                                                rHvalue = r1.Value;
                                            }
                                            else
                                            {
                                                rLvalue = r2.Value;
                                                rHvalue = 1 / ((1 / r1.Value) + (1 / r2.Value));
                                            }
                                            drivingNet = r1inDrivingPin.ConnectedNet;
                                            r_pullup = r1;
                                        }
                                        else if ((r2inDrivingPin != null) && (d1inPin != null) && (r2inDrivingPin.ConnectedNet == d1inPin.ConnectedNet))
                                        {
                                            if (d1inPin.Name == "K")
                                            {
                                                rLvalue = 1 / ((1 / r1.Value) + (1 / r2.Value));
                                                rHvalue = r1.Value;
                                            }
                                            else
                                            {
                                                rLvalue = r2.Value;
                                                rHvalue = 1 / ((1 / r1.Value) + (1 / r2.Value));
                                            }
                                            drivingNet = r2inDrivingPin.ConnectedNet;
                                            r_pullup = r2;
                                        }

                                        if ((rLvalue>0) && (rHvalue>0) && (drivingNet != null))
                                        {
                                            RC_LP lp = new RC_LP("LP" + outPins.Count.ToString(), drivingNet, rLvalue, rHvalue, c.Value);
                                            Schematics.Elements.Add(lp);
                                            inPinAtC.ConnectedNet.ConnectedPins.Add(lp.Out);
                                            Log(-2, "Low Pass Asym" + lp.Name + "  RL=" + rLvalue.ToString("F0") + "  RH=" + rHvalue.ToString("F0") + " C=" + c.ValueStr + "  added to " + inPinAtC.Owner.Name + "  Pin=" + inPinAtC.PinNo.ToString());
                                        }
                                    }

                                    Schematics.RemoveElement(r1);
                                    Schematics.RemoveElement(r2);
                                    Schematics.RemoveElement(c);
                                    Schematics.RemoveElement(d1);
                                    Schematics.RemoveElement(d2);
                                    Schematics.Elements.Add(r_pullup);
                                    Schematics.LogicLevel.H.ConnectedNet.ConnectedPins.Add(r_pullup.Passive[0]);
                                    inPinAtC.ConnectedNet.ConnectedPins.Add(r_pullup.Passive[1]);

                                }
                            }
                        }
                    }
                }
            }

            //Log(0, "Checking for Diode -ANDs");
            //foreach (Comp comp in Comps)
            //{
            //    if ((comp.BaseElement != null) && (comp.BaseElement is Resistor))
            //    {
            //        Resistor r = (Resistor)comp.BaseElement;
            //        for (int i = 0; i < r.Passive.Length; i++)
            //        {
            //            if (Net.IsPowerOrLogicHigh(r.Passive[i].ConnectedNet.Name) == true)
            //            {
            //                !!!!
            //            }
            //        }
            //    }
            //}
                            
            
            Log(0, "Linking bridged jumpers");
            foreach (Comp comp in Comps)
            {
                if ((comp.BaseElement != null) && (comp.BaseElement is Jumper2))
                {
                    Jumper2 jp2 = (Jumper2)comp.BaseElement;
                    if (jp2.Bridged)
                    {
                        if ((jp2.Passive[0].ConnectedNet != null) && (jp2.Passive[1].ConnectedNet != null))
                        {
                            for (int i = jp2.Passive[1].ConnectedNet.ConnectedPins.Count - 1; i >= 0; i--)
                            {
                                Pin pin = jp2.Passive[1].ConnectedNet.ConnectedPins[i];
                                jp2.Passive[1].ConnectedNet.ConnectedPins.RemoveAt(i);
                                jp2.Passive[0].ConnectedNet.ConnectedPins.Add(pin);
                            }
                        }
                    }
                }
                else if ((comp.BaseElement != null) && (comp.BaseElement is Jumper3))
                {
                    Jumper3 jp3 = (Jumper3)comp.BaseElement;
                    if (jp3.Bridged == Jumper3.BridgeType.Bridge12)
                    {
                        if ((jp3.Passive[0].ConnectedNet != null) && (jp3.Passive[1].ConnectedNet != null))
                        {
                            for (int i = jp3.Passive[1].ConnectedNet.ConnectedPins.Count - 1; i >= 0; i--)
                            {
                                Pin pin = jp3.Passive[1].ConnectedNet.ConnectedPins[i];
                                jp3.Passive[1].ConnectedNet.ConnectedPins.RemoveAt(i);
                                jp3.Passive[0].ConnectedNet.ConnectedPins.Add(pin);
                            }
                        }
                    }
                    else if (jp3.Bridged == Jumper3.BridgeType.Bridge23)
                    {
                        if ((jp3.Passive[1].ConnectedNet != null) && (jp3.Passive[2].ConnectedNet != null))
                        {
                            foreach (Pin pin in jp3.Passive[2].ConnectedNet.ConnectedPins)
                                jp3.Passive[1].ConnectedNet.ConnectedPins.Add(pin);
                        }
                    }
                }
            }

            Log(0, "Checking Unconnected Inputs and Power");
            foreach (Comp comp in Comps)
            {
                if (comp.BaseElement != null)
                {
                    foreach (Pin pin in comp.BaseElement.Power)
                        if ((pin.ConnectedNet == null) || (pin.ConnectedNet.ConnectedPins.Count <= 1))
                            Log(-2, "Ref=" + comp.Ref + " Name=" + comp.Name + " Power Pin=" + pin.PinNo.ToString() + " not connected!");

                    foreach (Pin pin in comp.BaseElement.Ground)
                        if ((pin.ConnectedNet == null) || (pin.ConnectedNet.ConnectedPins.Count <= 1))
                            Log(-2, "Ref=" + comp.Ref + " Name=" + comp.Name + " Ground Pin=" + pin.PinNo.ToString() + " not connected!");

                    for (int i = 0; i < comp.BaseElement.Inputs.Length; i++)
                        foreach (Pin pin in comp.BaseElement.Inputs[i])
                            if ((pin.ConnectedNet == null) || (pin.ConnectedNet.ConnectedPins.Count <= 1))
                                Log(-2, "Ref=" + comp.Ref + " Name=" + comp.Name + " Input Pin=" + pin.PinNo.ToString() + " not connected!");

                    foreach (Pin pin in comp.BaseElement.Passive)
                        if ((pin.ConnectedNet == null) || (pin.ConnectedNet.ConnectedPins.Count <= 1))
                            Log(-2, "Ref=" + comp.Ref + " Name=" + comp.Name + " Passive Pin=" + pin.PinNo.ToString() + " not connected!");
                }
                else
                    Log(-2, "Ref=" + comp.Ref + " Name=" + comp.Name + " misses BaseElement!");
            }

            //Log(0, "Listing Buses");
            //foreach (NetListBus bus in Buses)
            //{
            //    Log(2, bus.Name);
            //    foreach (NetListNet net in bus.Nets)
            //        Log(4, net.Name);
            //}

            //Log(0, "Listing Labeled Nets");
            //foreach (NetListNet net in Nets)
            //{
            //    if ((net.NetListBus == null) && net.IsLabeled)
            //        Log(2, net.Name);
            //}

            //Log(0, "Listing Unlabeled Nets");
            //foreach (NetListNet net in Nets)
            //{
            //    if ((net.NetListBus == null) && net.IsUnlabeled)
            //        Log(2, net.Name);
            //}

            //Log(0, "Listing Unconnected Nets");
            //foreach (NetListNet net in Nets)
            //{
            //    if ((net.NetListBus == null) && net.IsUnconnected)
            //        Log(2, net.Name);
            //}


            FullLogWriter.Close();
            FullLogWriter = null;
            ErrorLogWriter.Close();
            ErrorLogWriter = null;
        }

        /// <summary>
        /// Load the netlist from file and create hierarchy of level objects from the file.
        /// </summary>
        /// <param name="NetlistFileName">Full file name of the netlist file to load.</param>
        public void LoadNetlist(string NetlistFileName)
        {
            NetListDir = Path.GetDirectoryName(NetlistFileName)+"\\";

            StreamReader sr = new StreamReader(NetlistFileName);

            Level currentLevel = this.Levels;
            while (sr.EndOfStream == false)
            {
                string line = sr.ReadLine().Trim();
                while (line != "")
                {
                    char ch = line[0];
                    line = line.Substring(1).Trim();
                    string s = line;
                    int endpos = -1;

                    switch (ch)
                    {
                        case '(':
                            endpos = s.IndexOfAny(new char[] { ' ', '(', ')', '"' });
                            if (endpos > -1)
                            {
                                line = s.Substring(endpos + 1).Trim();
                                s = s.Substring(0, endpos).Trim();
                            }
                            else line = "";

                            Level newLevel = new Level(currentLevel, s);
                            currentLevel.Levels.Add(newLevel);
                            currentLevel = newLevel;
                            break;

                        case ')':
                            currentLevel = currentLevel.Owner;
                            break;

                        case '"':
                            endpos = s.IndexOf('"');
                            if (endpos > -1)
                            {
                                currentLevel.Text = s.Substring(0, endpos).Trim();
                                line = s.Substring(endpos + 1).Trim();
                            }
                            else
                            {
                                currentLevel.Text = s;
                                line = "";
                            }
                            break;
                    }
                }
            }

            sr.Close();
        }


#if XXX
        public void CreateSchematicsSourceCode(string SchematicsFileName)
        {
            HCT00 test = new HCT00("");
            StreamWriter sw = new StreamWriter(SchematicsFileName);
            sw.WriteLine("using System;");
            sw.WriteLine("using System.Collections.Generic;");
            sw.WriteLine("using System.Linq;");
            sw.WriteLine("using System.Text;");
            sw.WriteLine("using System.Threading.Tasks;");
            sw.WriteLine("");
            sw.WriteLine("using SimBase;");
            sw.WriteLine("using ChipLibrary;");
            sw.WriteLine("using ChipLibrary;");
            sw.WriteLine("using System.IO;");
            sw.WriteLine("");
            sw.WriteLine("namespace Schematics");
            sw.WriteLine("{");
            sw.WriteLine("public class NetlistSchematics : BaseSchematics");
            sw.WriteLine("{");
            sw.WriteLine("    public const string SCHEMATICS_NAME = \"Netlist\";");
            sw.WriteLine("");
            sw.WriteLine("    private Pin H;");
            sw.WriteLine("    private Pin L;");
            sw.WriteLine("");
            sw.WriteLine("    private ClockGenerator CG;");
            sw.WriteLine("    private ResetGenerator RST;");
            sw.WriteLine("");

            //sw.WriteLine("    private " + svalue + " " +)
            Level componentsLevel = FindLevel(this.Levels, "components");
            foreach (Level compLevel in componentsLevel.Levels)
            {
                if (compLevel.Name == "comp")
                {
                    Level refLevel = FindLevel(compLevel, "ref");
                    Level valLevel = FindLevel(compLevel, "value");
                    string sref = refLevel == null ? "?" : refLevel.Text;
                    string svalue = valLevel == null ? "?" : valLevel.Text;
                    sw.WriteLine("    private " + svalue + " " + sref + ";");

                    if (sref.StartsWith("U"))
                    {
                        if (svalue.StartsWith("74"))
                            svalue = svalue.Substring(2);
                        Comps.Add(new Comp(sref, svalue, compLevel));

                        Assembly assembly = GetAssembly(CHIP_LIBRARY);
                        Type type = assembly.GetType(CHIP_LIBRARY +"."+ svalue);
                        if (type != null)
                        {
                            object obj = Activator.CreateInstance(type, new object[] { sref });
                            if ((obj != null) && (obj is BaseElement))
                            {
                                Schematics.Elements.Add((BaseElement)obj);
                                sw.WriteLine("   private " + svalue + " " + sref + ";");
                            }
                            else sw.WriteLine("! Failed to create "+svalue + " " + sref + ";");
                        }
                        else sw.WriteLine("! Type " + svalue + " is missing!");
                    }
                }
            }

            sw.WriteLine("\r\n        public NetlistSchematics():base(SCHEMATICS_NAME)\r\n        {\r\n            H = new Pin(null, \"H\", 0, LineMode.Out, SignalState.H, 0);\r\n            L = new Pin(null, \"L\", 0, LineMode.Out, SignalState.L, 0);\r\n\r\n           Elements.Add(CG = new ClockGenerator(\"CG\", SignalState.L, 80, 0));\r\n");

            foreach (Comp comp in Comps)
            {
                //Elements.Add(U1 = new HCT04("U1",
                sw.WriteLine("    Elements.Add(" + comp.Ref + " = new " + comp.Name + "(\"" + comp.Ref + "\"));");
            }

            Level netsLevel = FindLevel(this.Levels, "nets");
            foreach (Level netLevel in netsLevel.Levels)
            {
                if (netLevel.Name == "net")
                {
                    Level codeLevel = FindLevel(netLevel, "code");
                    Level nameLevel = FindLevel(netLevel, "name");
                    string scode = codeLevel == null ? "?" : codeLevel.Text;
                    string sname = nameLevel == null ? "?" : nameLevel.Text;
                    string ss = "";
                    foreach (Level level in netLevel.Levels)
                    {
                        if (level.Name == "node")
                        {
                            List<Level> listInputs = new List<Level>();
                            List<Level> listOutputs = new List<Level>();
                            List<Level> listBiDir = new List<Level>();
                            List<Level> listOpenDrain = new List<Level>();
                            for (int i = 0; i < level.Levels.Count; i++)
                            {
                                Level typeLevel = FindLevel(level.Levels[i], "pintype");
                                if (typeLevel != null)
                                {
                                    if (typeLevel.Text == "input")
                                        listInputs.Add(level.Levels[i]);
                                    if (typeLevel.Text == "output")
                                        listOutputs.Add(level.Levels[i]);
                                    if (typeLevel.Text == "tri_state")
                                        listBiDir.Add(level.Levels[i]);
                                    if (typeLevel.Text == "open_drain")
                                        listOpenDrain.Add(level.Levels[i]);
                                }
                            }

                            if ((listInputs.Count > 0) && (listOutputs.Count == 1))
                            {
                                Level refLevelOut = FindLevel(listOutputs[0], "ref");
                                Level pinLevelOut = FindLevel(listOutputs[0], "pin");
                                string srefOut = refLevelOut == null ? "?" : refLevelOut.Text;
                                string spinOut = pinLevelOut == null ? "?" : pinLevelOut.Text;
                                int pinNoOut = Convert.ToInt32(spinOut);

                                BaseElement beOut = Schematics.GetElement(srefOut);
                                if (beOut != null)
                                {
                                    Pin pinOut = beOut.GetPin(pinNoOut);
                                    if (pinOut != null)
                                    {

                                        for (int i = 0; i < listInputs.Count; i++)
                                        {
                                            Level refLevelIn = FindLevel(level.Levels[i], "ref");
                                            Level pinLevelIn = FindLevel(level.Levels[i], "pin");
                                            string srefIn = refLevelIn == null ? "?" : refLevelIn.Text;
                                            string spinIn = pinLevelIn == null ? "?" : pinLevelIn.Text;
                                            int pinNoIn = Convert.ToInt32(spinIn);
                                            BaseElement beIn = Schematics.GetElement(srefIn);
                                            if (beIn != null)
                                            {
                                                Pin pinIn = beIn.GetPin(pinNoIn);
                                                if (pinIn != null)
                                                {
                                                    pinIn.ConnectedPins.Add(pinOut);
                                                    sw.WriteLine("   " + srefIn + "." + pinIn.Name + ".ConnectedPins.Add(" + srefOut + "." + pinOut.Name + ");");
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            //for (int i = 0; i < level.Levels.Count; i++)
                            //{
                            //    Level refLevel = FindLevel(level.Levels[i], "ref");
                            //    Level pinLevel = FindLevel(level.Levels[i], "pin");
                            //    Level typeLevel = FindLevel(level.Levels[i], "pintype");
                            //    string sref = refLevel == null ? "?" : refLevel.Text;
                            //    string spin = pinLevel == null ? "?" : pinLevel.Text;
                            //    string stype = typeLevel == null ? "?" : typeLevel.Text;
                            //}
                        }

                        sw.WriteLine();
                    }
                    
                }
            }
            sw.Close();
        }
#endif

#endregion Public Methods

    }
}
