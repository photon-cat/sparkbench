// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using SimBase;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace SimTTL
{
    /// <summary>
    /// A class to export a connection list for checking. 
    /// </summary>
    internal class ExportConnections
    {
        /// <summary>Reference to the main form object.</summary>
        private frmMain main;

        /// <summary>
        /// Creates the instance of the export class.
        /// </summary>
        /// <param name="Main">Reference to the main form object.</param>
        /// <param name="FileName">Full file name for the export csv file.</param>
        public ExportConnections(frmMain Main, string FileName)
        {
            this.main = Main;
            Export(FileName);
        }


        /// <summary>
        /// A generic function to determine if the passed signal name hints to a power or ground connection.
        /// </summary>
        /// <param name="NetName">A name string that might contain some standard strings hinting to power or ground.</param>
        /// <returns>True, if power or ground had been detected in the name.</returns>
        private bool IsPowerOrGround(string NetName)
        {
            return Net.IsGroundOrLogicLow(NetName) || Net.IsPowerOrLogicHigh(NetName);
        }

        /// <summary>
        /// Creates a string listing all connected pins for this output pin.
        /// </summary>
        /// <param name="Pin">Output pin to check for all connected pins.</param>
        /// <returns>String listing connected pins.</returns>
        private string FindConnectedPins(Pin Pin)
        {
            string s = ",Connected:," + NetName(Pin.ConnectedNet) + ",";

            if ((Pin.ConnectedNet != null) && (IsPowerOrGround(Pin.ConnectedNet.Name) == false))
                for (int k = 0; k < Pin.ConnectedNet.ConnectedPins.Count; k++)
                {
                    if (Pin.ConnectedNet.ConnectedPins[k].Owner != null)
                        s += "," + Pin.ConnectedNet.ConnectedPins[k].Owner.GetType().Name;
                    s += "," + Pin.ConnectedNet.ConnectedPins[k].LongName + ",# " + Pin.ConnectedNet.ConnectedPins[k].PinNo.ToString();
                }
            return s;
        }


        /// <summary>
        /// Returns the name is the net if exists or an empty string, if Net is null.
        /// </summary>
        /// <param name="Net">Reference to the net object or nul if none.</param>
        /// <returns>Name of the net or an empty string if the net reference is null.</returns>
        private string NetName(Net Net)
        {
            if (Net != null)
                return Net.Name;
            else
                return "";
        }


        /// <summary>
        /// Creates a string listing all connected pins for this input pin.
        /// </summary>
        /// <param name="Pin">Input pin to check for all connected pins.</param>
        /// <returns>String listing connected pins.</returns>
        private string FindConnectedInputPins(Pin Pin)
        {
            string s = ",Connected:," + NetName(Pin.ConnectedNet) + ",";

            if ((Pin.ConnectedNet != null) && (IsPowerOrGround(Pin.ConnectedNet.Name) == false))
                foreach (BaseElement element in main.Schematics.Elements)
                {
                    for (int i = 0; i < element.Inputs.Length; i++)
                    {
                        for (int j = 0; j < element.Inputs[i].Length; j++)
                        {
                            if (element.Inputs[i][j].ConnectedNet != null)
                                foreach (Pin p in element.Inputs[i][j].ConnectedNet.ConnectedPins)
                                    if (p == Pin)
                                    {
                                        s += "," + element.GetType().Name;
                                        s += "," + element.Inputs[i][j].LongName + ",# " + element.Inputs[i][j].PinNo.ToString();
                                    }
                        }

                    }
                }
            return s;
        }

        /// <summary>
        /// Write all connections to a CSV file to check correctness.
        /// </summary>
        /// <param name="FileName">Full filename of the CSV file.</param>
        public void Export(string FileName)
        {
            StreamWriter sw = null;
            try
            {
                sw = new StreamWriter(FileName);
                foreach (BaseElement element in main.Schematics.Elements)
                {
                    sw.Write(element.Name);
                    if (element is Passive2Pin)
                        sw.Write(":" + ((Passive2Pin)element).ValueStr);

                    if (element.Power != null)
                        for (int i = 0; i < element.Power.Length; i++)
                        {
                            sw.Write(",Power," + element.GetType().Name + "," + element.Power[i].LongName + ",# " + element.Power[i].PinNo.ToString());
                            sw.WriteLine(FindConnectedPins(element.Power[i]));
                        }

                    if (element.Ground != null)
                        for (int i = 0; i < element.Ground.Length; i++)
                        {
                            sw.Write(",Ground," + element.GetType().Name + "," + element.Ground[i].LongName + ",# " + element.Ground[i].PinNo.ToString());
                            sw.WriteLine(FindConnectedPins(element.Ground[i]));
                        }

                    if (element.Passive != null)
                        for (int i = 0; i < element.Passive.Length; i++)
                        {
                            sw.Write(",Passive," + element.GetType().Name + "," + element.Passive[i].LongName + ",# " + element.Passive[i].PinNo.ToString());
                            sw.WriteLine(FindConnectedPins(element.Passive[i]));
                        }

                    for (int i = 0; i < element.Inputs.Length; i++)
                    {
                        for (int j = 0; j < element.Inputs[i].Length; j++)
                        {
                            sw.Write(",Input," + element.GetType().Name + "," + element.Inputs[i][j].LongName + ",# " + element.Inputs[i][j].PinNo.ToString() + ",Connected:," + NetName(element.Inputs[i][j].ConnectedNet) + ",");

                            if ((element.Inputs[i][j].ConnectedNet != null) && (IsPowerOrGround(element.Inputs[i][j].ConnectedNet.Name) == false))
                                for (int k = 0; k < element.Inputs[i][j].ConnectedNet.ConnectedPins.Count; k++)
                                {
                                    string s = ",";
                                    if (element.Inputs[i][j].ConnectedNet.ConnectedPins[k].Owner != null)
                                        s += element.Inputs[i][j].ConnectedNet.ConnectedPins[k].Owner.GetType().Name;
                                    sw.Write(s + "," + element.Inputs[i][j].ConnectedNet.ConnectedPins[k].LongName + ",# " + element.Inputs[i][j].ConnectedNet.ConnectedPins[k].PinNo.ToString());
                                }
                            sw.WriteLine();
                        }
                    }
                    for (int i = 0; i < element.Outputs.Length; i++)
                    {
                        for (int j = 0; j < element.Outputs[i].Length; j++)
                        {
                            sw.Write(",Output," + element.GetType().Name + "," + element.Outputs[i][j].LongName + ",# " + element.Outputs[i][j].PinNo.ToString());
                            sw.WriteLine(FindConnectedInputPins(element.Outputs[i][j]));
                        }
                    }
                    sw.WriteLine();

                }
            }
            catch (Exception ex) { MessageBox.Show(ex.Message); }
            if (sw != null)
                sw.Close();

        }
    }
}
