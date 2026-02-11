// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SimBase
{
    /// <summary>
    /// A class to combine a number of signals to a bus.
    /// </summary>
    public class SignalBus:BaseElement
    {
        /// <summary>
        /// Creates the instance of the SignalBus.
        /// </summary>
        /// <param name="Name">Name of the bus.</param>
        /// <param name="BusWidth">Width of the bus.</param>
        public SignalBus(string Name, int BusWidth) : base(Name)
        {

            Power = new Pin[0];
            Ground = new Pin[0];
            Passive = new Pin[0];

            Inputs = new Pin[1][];
            Inputs[0] = new Pin[BusWidth];
            for (int i = 0; i < BusWidth; i++)
                Inputs[0][i] = new Pin(this, i.ToString(), "", LineMode.In, SignalState.Z, new Net(Name + "." + i.ToString()));
        }

        /// <summary>
        /// Creates the instance of the SignalBus.
        /// </summary>
        /// <param name="Name">Name of the bus</param>
        /// <param name="BusNets">List of nets to connect to.</param>
        public SignalBus(string Name, Net[] BusNets) : this(Name, BusNets.Length)
        {
            for (int i = 0; i < BusNets.Length; i++)
            {
                Inputs[0][i].ConnectedNet = BusNets[i];
                Inputs[0][i].ConnectedNet.Name = Name + "." + i.ToString();
            }
        }

        /// <summary>
        /// Add the pin array to the bus.
        /// </summary>
        /// <param name="BusPins">Array to add.</param>
        public void AddPins(Pin[] BusPins)
        {
            for (int i = 0; i < BusPins.Length; i++)
                Inputs[0][i].ConnectedNet.ConnectedPins.Add(BusPins[i]);
        }

        /// <summary>
        /// Gets the connected net for the indexed bus element.
        /// </summary>
        /// <param name="Idx">Index of the net.</param>
        /// <returns>Net object from the index.</returns>
        public Net this[int Idx]
        {
            get { return Inputs[0][Idx].ConnectedNet; }
        }

        public override void Update(double Time)
        {
            //if ((Name == "BUS") && (Time >= 2159))
            //    Debug.WriteLine("");

            base.Update(Time);
        }
    }
}
